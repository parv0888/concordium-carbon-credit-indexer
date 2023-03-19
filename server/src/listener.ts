import { credentials } from '@grpc/grpc-js/';
import {
    AccountTransactionSummary,
    BaseAccountTransactionSummary,
    BlockItemSummary,
    createConcordiumClient,
    InitContractSummary,
    TransactionEventTag,
    TransactionKindString,
    TransactionSummaryType,
    UpdateContractSummary,
    ContractAddress,
} from '@concordium/node-sdk';
import * as dotenv from 'dotenv';
import getDb, { IBlock } from './db';
import {
    toContractNameFromInitName,
    toDbContractAddress,
    toContractNameFromReceiveName,
} from './utils';
import sleep from 'sleep-promise';
import { DbBlockEvent, DbEvent, DbTransactionEvent } from './cis2-event-types';
import { deserializeEventValue } from 'server-rust-bindings';
import {
    contractModules,
    shouldProcessAccountTransaction,
    shouldProcessBlock,
    shouldProcessContract,
    shouldProcessInitContractTransaction,
    toDbEvent,
} from './listener-config';
dotenv.config();

const nodeEndpoint = process.env.NODE_ENDPOINT || '';
const nodePort = parseInt(process.env.NODE_PORT || '');
const mongodbConnString = process.env.DB_CONN_STRING || '';
const startingBlockHash = process.env.STARTING_BLOCK_HASH || '';

const client = createConcordiumClient(
    nodeEndpoint,
    nodePort,
    credentials.createInsecure(),
    { timeout: 15000 }
);

(async () => {
    const db = await getDb(mongodbConnString);

    const parseTransaction = async (
        transaction: BlockItemSummary
    ): Promise<DbTransactionEvent<Record<string, any>>[]> => {
        switch (transaction.type) {
            case TransactionSummaryType.AccountTransaction:
                if (!shouldProcessAccountTransaction(transaction.hash)) {
                    return [];
                }

                const events = await parseAccountTransaction(transaction);
                return events.map((e) => ({
                    ...e,
                    transaction: {
                        hash: transaction.hash,
                        transactionIndex: transaction.index.toString(),
                        blockItemType: transaction.type,
                        transactionType: transaction.transactionType,
                    },
                }));
            default:
            case TransactionSummaryType.AccountCreation:
            case TransactionSummaryType.UpdateTransaction:
                console.debug(
                    `skipping transaction of type: ${transaction.type}`
                );
                return [];
        }
    };

    const parseAccountTransaction = async (
        transaction: AccountTransactionSummary
    ): Promise<DbEvent<Record<string, any>>[]> => {
        switch (transaction.transactionType) {
            case TransactionKindString.InitContract:
                return parseInitContractAccountTransaction(transaction);
            case TransactionKindString.Update:
                return parseUpdateContractAccountTransaction(transaction);
            default:
                console.debug(
                    `skipping account transaction of type: ${transaction.transactionType}`
                );
                return [];
        }
    };

    const parseInitContractAccountTransaction = async (
        transaction: BaseAccountTransactionSummary & InitContractSummary
    ): Promise<DbEvent<Record<string, any>>[]> => {
        if (!shouldProcessInitContractTransaction(transaction)) {
            return [];
        }

        const schema = contractModules[transaction.contractInitialized.ref];
        if (!schema) {
            console.error(
                `no schema present for module:${transaction.contractInitialized.ref}`
            );

            return [];
        }

        return transaction.contractInitialized.events
            .map((contractEvent) =>
                deserializeEventValue(
                    contractEvent,
                    schema.moduleSchema,
                    toContractNameFromInitName(
                        transaction.contractInitialized.initName
                    ),
                    3
                )
            )
            .map((e) => ({
                event: toDbEvent(JSON.parse(e)),
                eventType: TransactionEventTag.ContractInitialized,
                address: toDbContractAddress(
                    transaction.contractInitialized.address
                ),
            }));
    };

    const parseUpdateContractAccountTransaction = async (
        transaction: BaseAccountTransactionSummary & UpdateContractSummary
    ): Promise<DbEvent<Record<string, any>>[]> => {
        const updateEvents = transaction.events
            .map((e) => {
                switch (e.tag) {
                    case TransactionEventTag.Updated:
                        return {
                            address: e.address,
                            events: e.events,
                            tag: e.tag,
                            receiveName: e.receiveName,
                        };
                    default:
                        return {};
                }
            })
            .filter((e) => !!e.address)
            .filter((e) => shouldProcessContract(e.address))
            .map((e) => ({
                address: e.address as ContractAddress,
                events: e.events as string[],
                tag: e.tag as TransactionEventTag,
                receiveName: e.receiveName as string,
            }));

        const events = [];

        for (const txnEvent of updateEvents) {
            const instanceInfo = await client.getInstanceInfo(txnEvent.address);
            const schema = contractModules[instanceInfo.sourceModule.moduleRef];
            if (!schema) {
                console.error(
                    `no schema present for module:${instanceInfo.sourceModule.moduleRef}`
                );

                return [];
            }

            events.push(
                ...txnEvent.events
                    .map((contractEvent) =>
                        deserializeEventValue(
                            contractEvent,
                            schema.moduleSchema,
                            toContractNameFromReceiveName(txnEvent.receiveName),
                            3
                        )
                    )
                    .filter((e) => e.startsWith('{'))
                    .map((e) => ({
                        event: toDbEvent(JSON.parse(e)),
                        eventType: txnEvent.tag,
                        address: toDbContractAddress(txnEvent.address),
                    }))
            );
        }

        return events;
    };

    const parseBlock = async (
        block: IBlock
    ): Promise<DbBlockEvent<Record<string, any>>[]> => {
        const blockTransactionEvents = client.getBlockTransactionEvents(
            block.blockHash
        );
        const events = [];

        for await (const transaction of blockTransactionEvents) {
            const transactionEVents = await parseTransaction(transaction);
            events.push(...transactionEVents.map((e) => ({ ...e, block })));
        }

        return events;
    };

    while (true) {
        console.log('getting consensus info');
        const consensusStatus = await client.getConsensusStatus();

        let initBlockHash = startingBlockHash;
        if (!initBlockHash) {
            initBlockHash = consensusStatus.genesisBlock;
        }

        const startingBlockInfo = await client.getBlockInfo(startingBlockHash);

        let highestBlockHeight = startingBlockInfo.blockHeight;
        const highestBlock = await db.blocks
            .find({})
            .sort({ blockHeight: 'desc' })
            .limit(1);

        if (highestBlock.length) {
            //todo: fix this
            highestBlockHeight =
                startingBlockInfo.blockHeight > highestBlock[0].blockHeight
                    ? startingBlockInfo.blockHeight
                    : BigInt(highestBlock[0].blockHeight);
        }

        console.log(`highest block saved: ${highestBlockHeight}`);
        console.log(
            `consensus status block: ${consensusStatus.bestBlockHeight}`
        );

        for (
            let blockHeight = highestBlockHeight + BigInt(1);
            blockHeight <= consensusStatus.lastFinalizedBlockHeight;
            blockHeight++
        ) {
            console.log(`processing block at height: ${blockHeight}`);
            const blocks = await client.getBlocksAtHeight(BigInt(blockHeight));

            if (blocks.length > 1) {
                throw new Error(
                    `got ${blocks.length} blocks at height: ${blockHeight}`
                );
            }

            const block: IBlock = {
                blockHeight: parseInt(blockHeight.toString()),
                blockHash: blocks[0],
            };

            if (shouldProcessBlock(block.blockHash)) {
                const events = await parseBlock(block);
                const contractEvents = events.map(
                    (e) => new db.contractEvents(e)
                );

                if (contractEvents.length) {
                    await db.contractEvents.bulkSave(contractEvents);
                }

                console.log('saved events', contractEvents);
            }

            await new db.blocks(block).save();
        }

        await sleep(5000);
        console.debug('checking for new block');
    }
})()
    .then(() => console.log('complete'))
    .catch((err) => console.error(`error: ${err.message}`));

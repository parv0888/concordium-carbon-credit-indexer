import { credentials } from "@grpc/grpc-js/";
import {
    BaseAccountTransactionSummary,
    BlockItemSummary,
    createConcordiumClient,
    InitContractSummary,
    TransactionEventTag,
    TransactionKindString,
    TransactionSummaryType,
    UpdateContractSummary,
} from "@concordium/node-sdk";
import getDb, { IBlock } from "./db";
import { toContractNameFromInitName, toDbContractAddress, toContractNameFromReceiveName, toDbEvent } from './utils';
import sleep from "sleep-promise";
import { Cis2Event } from "./cis2EventTypes";
import { deserializeEventValue } from "server-rust-bindings";
import { contractModules } from "./listener-modules";

const nodeEndpoint = process.env.NODE_ENDPOINT || "localhost";
const nodePort = process.env.NODE_PORT
    ? parseInt(process.env.NODE_PORT)
    : 20002;
const mongodbConnString =
    process.env.DB_CONN_STRING || "mongodb://root:example@localhost:27017/";
const startingBlockHash = process.env.STARTING_BLOCK_HASH || "f44a796e78dafe98d669e3aa9c5bc8770f224f5236adc7a3cd90fdecf1d4b361";
const client = createConcordiumClient(
    nodeEndpoint,
    nodePort,
    credentials.createInsecure(),
    { timeout: 15000 }
);

(async () => {
    const db = await getDb(mongodbConnString);

    const processInitContractAccountTransaction = async (
        block: IBlock,
        transaction: BaseAccountTransactionSummary & InitContractSummary) => {
        const schema = contractModules[transaction.contractInitialized.ref];
        if (!schema) {
            return [];
        }

        console.log(
            `saving init event in block height:${blockHeight}, txnIndex: ${transaction.index.toString()}`
        );

        var deserializedEvents = [];
        for (const contractEvent of transaction.contractInitialized.events) {
            const deEventStr = deserializeEventValue(
                contractEvent,
                schema.moduleSchema,
                toContractNameFromInitName(transaction.contractInitialized.initName),
                3
            );

            var deserializedEvent = JSON.parse(deEventStr) as Cis2Event;
            deserializedEvents.push({
                event: toDbEvent(deserializedEvent),
                eventType: TransactionEventTag.ContractInitialized.toString(),
                address: toDbContractAddress(transaction.contractInitialized.address),
                block: block,
                transaction: {
                    hash: transaction.hash,
                    transactionIndex: transaction.index,
                    blockItemType: transaction.type,
                    transactionType: transaction.transactionType,
                },
            });
        }

        if (deserializedEvents.length) {
            await db.contractEvents.bulkSave(deserializedEvents.map(e => new db.contractEvents(e)));
            console.log("Deserialized Events", deserializedEvents);
        }

        return deserializedEvents;
    };

    const processUpdateContractAccountTransaction = async (
        block: IBlock,
        transaction: BaseAccountTransactionSummary & UpdateContractSummary) => {
        for (const txnEvent of transaction.events) {
            switch (txnEvent.tag) {
                case TransactionEventTag.Updated:
                    const instanceInfo = await client.getInstanceInfo(txnEvent.address);
                    const schema = contractModules[instanceInfo.sourceModule.moduleRef];

                    if (schema) {
                        console.log(
                            `saving update transaction in block height:${blockHeight}, txnIndex: ${transaction.index.toString()}`
                        );
                        var deserializedEvents = [];

                        for (const contractEvent of txnEvent.events) {
                            console.log(`Contract Event: ${contractEvent}`);
                            var deEventStr = deserializeEventValue(
                                contractEvent,
                                schema.moduleSchema,
                                toContractNameFromReceiveName(txnEvent.receiveName),
                                3
                            );
                            console.log(deEventStr);
                            if (deEventStr.startsWith("{")) {
                                var deserializedEvent = JSON.parse(deEventStr);
                                deserializedEvents.push({
                                    event: toDbEvent(deserializedEvent),
                                    eventType: txnEvent.tag.toString(),
                                    address: toDbContractAddress(txnEvent.address),
                                    block: block,
                                    transaction: {
                                        hash: transaction.hash,
                                        transactionIndex: transaction.index,
                                        blockItemType: transaction.type,
                                        transactionType: transaction.transactionType,
                                    },
                                });
                            }
                        }

                        if (deserializedEvents.length) {
                            await db.contractEvents.bulkSave(deserializedEvents.map(e => new db.contractEvents(e)));
                            console.log("Deserialized Events: ", deserializedEvents);
                        }
                    }
                    break;
                default:
                    console.log(`skipping transaction of type: ${txnEvent.tag}`);
                    break;

            }
        }
    };

    const processTransaction = async (block: IBlock, transaction: BlockItemSummary) => {
        switch (transaction.type) {
            case TransactionSummaryType.AccountTransaction:
                switch (transaction.transactionType) {
                    case TransactionKindString.InitContract:
                        await processInitContractAccountTransaction(block, transaction);
                        break;
                    case TransactionKindString.Update:
                        await processUpdateContractAccountTransaction(block, transaction);
                        break;
                    default:
                        console.debug(
                            `skipping account transaction of type: ${transaction.transactionType}`
                        );
                        break;
                }
                break;
            default:
            case TransactionSummaryType.AccountCreation:
            case TransactionSummaryType.UpdateTransaction:
                console.debug(`skipping transaction of type: ${transaction.type}`);
                break;
        }
    };

    const processBlock = async (block: IBlock) => {
        const blockTransactionEvents = client.getBlockTransactionEvents(block.blockHash);
        for await (const transaction of blockTransactionEvents) {
            await processTransaction(block, transaction);
        }
    };

    while (true) {
        const consensusStatus = await client.getConsensusStatus();

        var initBlockHash = startingBlockHash;
        if (!initBlockHash) {
            initBlockHash = consensusStatus.genesisBlock;
        }

        const startingBlockInfo = await client.getBlockInfo(startingBlockHash);

        var highestBlockHeight = startingBlockInfo.blockHeight;
        const highestBlock = await db.blocks
            .find({})
            .sort({ blockHeight: "desc" })
            .limit(1);

        if (highestBlock.length) {
            //todo: fix this
            highestBlockHeight = startingBlockInfo.blockHeight > highestBlock[0].blockHeight
                ? startingBlockInfo.blockHeight
                : BigInt(highestBlock[0].blockHeight);
        }

        console.log(`highest block saved: ${highestBlockHeight}`);
        console.log(`consensus status block: ${consensusStatus.bestBlockHeight}`);

        for (
            var blockHeight = highestBlockHeight + BigInt(1);
            blockHeight <= consensusStatus.lastFinalizedBlockHeight;
            blockHeight++
        ) {
            console.log(`processing block at height: ${blockHeight}`);
            const blocks = await client.getBlocksAtHeight(BigInt(blockHeight));

            if (blocks.length > 1) {
                throw new Error(`got ${blocks.length} blocks at height: ${blockHeight}`);
            }

            const block: IBlock = {
                blockHeight: parseInt(blockHeight.toString()),
                blockHash: blocks[0],
            };
            await processBlock(block);
            await new db.blocks(block).save();
        }

        await sleep(5000);
        console.debug("checking for new block");
    }
})().then(() => console.log("complete")).catch((err) => console.log(`error: ${err.message}`))


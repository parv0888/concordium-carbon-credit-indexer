import { ContractAddress } from '@concordium/node-sdk';
import { IListenerPlugin } from '../listener-plugin';
import { PluginBlockItem } from '../plugin-types';
import { ICis2MarketDb } from './cis2-market-db';
import { IContractEvent } from '../../db/db-types';

export class Cis2MarketPlugin implements IListenerPlugin {
    moduleRef =
        '247a7ac6efd2e46f72fd18741a6d1a0254ec14f95639df37079a576b2033873e';
    moduleSchema =
        'FFFF03010000000A0000004D61726B65742D4E465401001400010000000A000000636F6D6D697373696F6E03030000000300000061646400140005000000140000006E66745F636F6E74726163745F616464726573730C08000000746F6B656E5F69641D000500000070726963650A07000000726F79616C747903080000007175616E746974791B25000000040000006C69737401140101000000100114000700000008000000746F6B656E5F69641D0008000000636F6E74726163740C0500000070726963650A050000006F776E65720B07000000726F79616C7479030D0000007072696D6172795F6F776E65720B080000007175616E746974791B25000000080000007472616E7366657200140005000000140000006E66745F636F6E74726163745F616464726573730C08000000746F6B656E5F69641D0002000000746F0B050000006F776E65720B080000007175616E746974791B250000000115010000000F0000005175616E7469747955706461746564010100000014000700000008000000746F6B656E5F69641D0008000000636F6E74726163740C0500000070726963650A050000006F776E65720B07000000726F79616C7479030D0000007072696D6172795F6F776E65720B080000007175616E746974791B25000000';
    contractIndex = BigInt(3913);
    db: ICis2MarketDb;

    constructor(db: ICis2MarketDb) {
        this.db = db;
    }

    getName(): string {
        return 'cis2-market-plugin';
    }

    async insertBlockItems(
        blockHash: string,
        blockHeight: bigint,
        items: PluginBlockItem[]
    ): Promise<void> {
        const events = items.flatMap((i) =>
            i.events
                .map(
                    (i2) =>
                        ({
                            block: {
                                blockHash,
                                blockHeight: parseInt(blockHeight.toString()),
                            },
                            transaction: {
                                hash: i.hash,
                                blockItemType: i.type,
                                transactionType: i.transactionType,
                                transactionIndex: i.transactionIndex.toString(),
                            },
                            eventType: i.transactionEventType,
                            address: {
                                index: i.contractAddress.index.toString(),
                                subindex: i.contractAddress.subindex.toString(),
                            },
                            event: i2,
                        } as IContractEvent)
                )
                .map((e) => new this.db.contractEvents(e))
        );

        if (events.length) {
            console.log(
                `cis2-market-plugin: inserting ${events.length} events`
            );
            await this.db.contractEvents.bulkSave(events);
        }
    }

    shouldProcessContract(address: ContractAddress): boolean {
        return (
            address.index === this.contractIndex &&
            address.subindex === BigInt(0)
        );
    }

    getModuleSchema(ref: string): string {
        if (ref === this.moduleRef) {
            return this.moduleSchema;
        }

        throw new Error('unsupported module reference');
    }

    shouldProcessBlock(_blockHash: string): boolean {
        return true;
    }

    shouldProcessModule(moduleRef: string): boolean {
        return moduleRef === this.moduleRef;
    }
}

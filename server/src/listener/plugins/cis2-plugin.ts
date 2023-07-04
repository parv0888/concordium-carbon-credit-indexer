import { ContractAddress } from '@concordium/node-sdk';
import { IListenerPlugin } from '../listener-plugin';
import { PluginBlockItem } from '../plugin-types';
import { IContractEvent } from '../../db/db-types';
import { ICis2Db } from './cis2-db';
import { toContractNameFromReceiveName } from '../../utils';

export class ProjectNftPlugin implements IListenerPlugin {
    db: ICis2Db;
    moduleRef: string;
    moduleSchema: string;

    constructor(db: ICis2Db, moduleRef: string, moduleSchema: string) {
        this.db = db;
        this.moduleRef = moduleRef;
        this.moduleSchema = moduleSchema;
    }

    shouldProcessContractMethod(receiveName: string): unknown {
        const contractName = toContractNameFromReceiveName(receiveName);

        return contractName === this.getName();
    }

    getName(): string {
        return 'project-nft';
    }

    async insertBlockItems(blockHash: string, blockHeight: bigint, items: PluginBlockItem[]): Promise<void> {
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

        await this.db.contractEvents.bulkSave(events);
    }

    shouldProcessContractAddress(_address: ContractAddress): boolean {
        return true;
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

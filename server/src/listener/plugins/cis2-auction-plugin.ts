import { ContractAddress } from '@concordium/node-sdk';
import { IListenerPlugin } from '../listener-plugin';
import { PluginBlockItem } from '../plugin-types';
import { IContractEvent } from '../../db/db-types';
import { ICis2AuctionDb } from './cis2-auction-db';
import moment from 'moment';

export type EventContractAddress = { index: number; subindex: number };
export type EventAccountAddress = string;
export type EventTokenId = string;

export type AuctionEventAuctionStateNotInitialized = { NotInitialized: [] };
export type AuctionEventAuctionStateNotSoldYet = {
    NotSoldYet: [
        {
            amount: string;
            contract: EventContractAddress;
            token_id: EventTokenId;
        }
    ];
};
export type AuctionEventAuctionStateSold = {
    Sold: [EventAccountAddress];
};
export type AuctionEventAuctionState =
    | AuctionEventAuctionStateNotInitialized
    | AuctionEventAuctionStateNotSoldYet
    | AuctionEventAuctionStateSold;

export type Option<T> = { None: [] } | { Some: [T] };

export type AuctionUpdatedAuctionEvent = {
    AuctionUpdated: [
        {
            auction_state: AuctionEventAuctionState;
            start: string;
            end: string;
            highest_bid: number;
            minimum_raise: number;
            highest_bidder: Option<EventAccountAddress>;
            participation_token: Option<{
                contract: EventContractAddress;
                token_id: EventTokenId;
            }>;
        }
    ];
};

export type ParticipantAddedAuctionEvent = {
    ParticipantAdded: [EventAccountAddress];
};

export type AuctionContractEvent =
    | AuctionUpdatedAuctionEvent
    | ParticipantAddedAuctionEvent;

export type AuctionEventDbAuctionStateNotInitialized = {
    name: 'NotInitialized';
};

export type AuctionEventDbAuctionStateNotSoldYet = {
    name: 'NotSoldYet';
    amount: string;
    contract: EventContractAddress;
    token_id: EventTokenId;
};

export type AuctionEventDbAuctionStateSold = {
    name: 'Sold';
};

export type AuctionEventDbAuctionState =
    | AuctionEventDbAuctionStateNotInitialized
    | AuctionEventDbAuctionStateNotSoldYet
    | AuctionEventDbAuctionStateSold;

export type AuctionUpdatedAuctionDbEvent = {
    type: 'AuctionUpdated';
    auction_state: AuctionEventDbAuctionState;
    start: number;
    end: number;
    highest_bid: number;
    minimum_raise: number;
    highest_bidder?: EventAccountAddress;
    participation_token?: {
        contract: EventContractAddress;
        token_id: EventTokenId;
    };
};
export type ParticipantAddedAuctionDbEvent = {
    type: 'ParticipantAdded';
    participant: EventAccountAddress;
};

export type AuctionDbEvent =
    | AuctionUpdatedAuctionDbEvent
    | ParticipantAddedAuctionDbEvent;

export class Cis2AuctionPlugin implements IListenerPlugin {
    moduleRef =
        'cc68639cd6fbb4e0af22c675c06ecbb4ebcdc44318898a89f055586c12099c6d';
    moduleSchema =
        'ffff03010000000700000061756374696f6e010014000400000003000000656e640d0500000073746172740d0d0000006d696e696d756d5f7261697365051300000070617274696369706174696f6e5f746f6b656e1502000000040000004e6f6e650204000000536f6d65010100000014000200000008000000636f6e74726163740c08000000746f6b656e5f69641d0006000000030000006269640315090000000b0000004f6e6c794163636f756e74021200000042696442656c6f7743757272656e74426964021400000042696442656c6f774d696e696d756d5261697365020a000000426964546f6f4c617465020b000000426964546f6f4561726c79020e00000041756374696f6e4e6f744f70656e020f0000004e6f74415061727469636970616e7402080000004c6f674572726f72020d0000005472616e736665724572726f72020600000063616e426964050a1505000000090000004e6f4e6f744f70656e020c0000004e6f4e6f745374617274656402070000004e6f456e64656402110000004e6f4e6f74415061727469636970616e7402110000004e6f436f6e7472616374416464726573730214000000636f6e766572744575726f43656e74546f43636406050a15010000000b0000005061727365506172616d73020800000066696e616c697a650315040000001200000041756374696f6e5374696c6c416374697665020e00000041756374696f6e4e6f744f70656e0211000000436973325472616e736665724572726f7202080000004c6f674572726f72020f0000006f6e526563656976696e67434953320315080000000b0000005061727365506172616d73020c000000436f6e74726163744f6e6c79020b0000004f6e6c794163636f756e74020c000000556e417574686f72697a6564021900000041756374696f6e416c7265616479496e697469616c697a656402080000004c6f674572726f720219000000496e76616c696450617274696369706174696f6e546f6b656e020d0000005075626c696341756374696f6e021c0000006f6e526563656976696e6750617274696369706174696f6e434953320315080000000b0000005061727365506172616d73020c000000436f6e74726163744f6e6c79020b0000004f6e6c794163636f756e74020c000000556e417574686f72697a6564021900000041756374696f6e416c7265616479496e697469616c697a656402080000004c6f674572726f720219000000496e76616c696450617274696369706174696f6e546f6b656e020d0000005075626c696341756374696f6e020115020000000e00000041756374696f6e5570646174656401010000001400070000000d00000061756374696f6e5f737461746515030000000e0000004e6f74496e697469616c697a6564020a0000004e6f74536f6c64596574010100000014000300000008000000636f6e74726163740c08000000746f6b656e5f69641d0006000000616d6f756e741b2500000004000000536f6c6401010000000b0e000000686967686573745f6269646465721502000000040000004e6f6e650204000000536f6d6501010000000b0d0000006d696e696d756d5f72616973650503000000656e640d0500000073746172740d1300000070617274696369706174696f6e5f746f6b656e1502000000040000004e6f6e650204000000536f6d65010100000014000200000008000000636f6e74726163740c08000000746f6b656e5f69641d000b000000686967686573745f62696405100000005061727469636970616e74416464656401010000000b';
    db: ICis2AuctionDb;

    constructor(db: ICis2AuctionDb) {
        this.db = db;
    }

    getName(): string {
        return 'cis2-auction';
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
                            event: this.toDbEvent(i2),
                        } as IContractEvent)
                )
                .map((e) => new this.db.contractEvents(e))
        );

        await this.db.contractEvents.bulkSave(events);
    }

    /**
     * Converts an Auction Contract Event to an Auction Db Event.
     * @param e Auction Contract Event
     * @returns Auction Db Event
     */
    public toDbEvent(e: AuctionContractEvent): AuctionDbEvent {
        return Object.keys(e).map((k) => {
            switch (k) {
                case 'AuctionUpdated':
                    const e2 = (e as AuctionUpdatedAuctionEvent)
                        .AuctionUpdated[0];
                    return {
                        type: 'AuctionUpdated',
                        start: moment(e2.start).unix(),
                        end: moment(e2.end).unix(),
                        highest_bid: e2.highest_bid,
                        minimum_raise: e2.minimum_raise,
                        highest_bidder: this.optionToNullable(
                            e2.highest_bidder
                        ),
                        participation_token: this.optionToNullable(
                            e2.participation_token
                        ),
                        auction_state: this.enumToObject(e2.auction_state, {
                            NotInitialized: () => ({
                                name: 'NotInitialized',
                            }),
                            NotSoldYet: (
                                e: AuctionEventAuctionStateNotSoldYet
                            ) => ({
                                name: 'NotSoldYet',
                                amount: e.NotSoldYet[0].amount,
                                token_id: e.NotSoldYet[0].token_id,
                                contract: e.NotSoldYet[0].contract,
                            }),
                            Sold: () => ({
                                name: 'Sold',
                            }),
                        }),
                    } as AuctionUpdatedAuctionDbEvent;
                case 'ParticipantAdded':
                    const e3 = e as ParticipantAddedAuctionEvent;
                    return {
                        participant: e3.ParticipantAdded[0],
                        type: 'ParticipantAdded',
                    } as ParticipantAddedAuctionDbEvent;
                default:
                    throw new Error('unsupported event');
            }
        })[0];
    }

    optionToNullable<T, R>(
        highest_bidder: Option<T>,
        someMap: (input: T) => R = (e) => e as any
    ): R | undefined {
        return this.enumToObject(highest_bidder, {
            None: () => undefined,
            Some: (e: any) => someMap(e.Some[0]),
        });
    }

    enumToObject(enumObj: any, maps: { [name: string]: (e: any) => any }): any {
        const enumName = Object.keys(enumObj)[0];
        return maps[enumName](enumObj);
    }

    shouldProcessContract(_address: ContractAddress): boolean {
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

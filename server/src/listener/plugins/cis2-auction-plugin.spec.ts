import moment from 'moment';
import {
    AuctionContractEvent,
    AuctionUpdatedAuctionDbEvent,
    Cis2AuctionPlugin,
} from './cis2-auction-plugin';

describe('CIS2AuctionPlugin', () => {
    test('should be able to map Auction Event to Db Event', () => {
        const cis2AuctionPlugin = new Cis2AuctionPlugin({} as never);
        const auctionUpdatedEvent = {
            AuctionUpdated: [
                {
                    auction_state: {
                        NotSoldYet: [
                            {
                                amount: '1',
                                contract: {
                                    index: 4288,
                                    subindex: 0,
                                },
                                token_id: '01',
                            },
                        ],
                    },
                    end: '2023-04-13T10:53:00+00:00',
                    highest_bid: 0,
                    highest_bidder: {
                        None: [],
                    },
                    minimum_raise: 0,
                    participation_token: {
                        None: [],
                    },
                    start: '2023-04-12T10:53:00+00:00',
                },
            ],
        } as AuctionContractEvent;
        const auctionUpdatedDbEvent: AuctionUpdatedAuctionDbEvent = {
            type: 'AuctionUpdated',
            start: moment('2023-04-12T10:53:00+00:00').unix(),
            end: moment('2023-04-13T10:53:00+00:00').unix(),
            highest_bid: 0,
            minimum_raise: 0,
            auction_state: {
                name: 'NotSoldYet',
                amount: '1',
                token_id: '01',
                contract: { index: 4288, subindex: 0 },
            },
            participation_token: undefined,
            highest_bidder: undefined,
        };
        expect(cis2AuctionPlugin.toDbEvent(auctionUpdatedEvent)).toStrictEqual(
            auctionUpdatedDbEvent
        );
    });
});

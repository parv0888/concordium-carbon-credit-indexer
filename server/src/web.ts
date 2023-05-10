import express, { Application, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { default as cors } from 'cors';
import getDb, { getHighestBlockHeight } from './db/db';
import moment from 'moment';
dotenv.config();

const port = process.env.APP_PORT || '';
const mongodbConnString = process.env.DB_CONN_STRING || '';

(async () => {
    const db = await getDb(mongodbConnString);
    const app: Application = express();
    app.use(cors());

    app.get('/system/block-height', async (req: Request, res: Response) => {
        const blockHeight = await getHighestBlockHeight(db);
        res.json(blockHeight.toString());
    });

    app.get(
        '/market/index/:index/subindex/:subindex/tokens',
        async (req: Request, res: Response) => {
            try {
                const resDocs = await db.contractEvents.aggregate([
                    {
                        $match: {
                            address: {
                                index: req.params.index,
                                subindex: req.params.subindex,
                            },
                        },
                    },
                    {
                        $sort: { 'block.blockHeight': 1 },
                    },
                    {
                        $group: {
                            _id: '$event.QuantityUpdated.owner',
                            doc: { $last: '$$ROOT' },
                        },
                    },
                    { $replaceRoot: { newRoot: '$doc' } },
                ]);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                res.json(resDocs.map((r: any) => r.event.QuantityUpdated[0]));
            } catch (err) {
                console.error(err);
                res.json(err).status(503);
            }
        }
    );

    app.get('/auctions/live', async (req: Request, res: Response) => {
        try {
            const resDocs = await db.contractEvents.aggregate([
                {
                    $match: {
                        'event.type': 'AuctionUpdated',
                        'event.auction_state.name': 'NotSoldYet',
                        'event.start': { $lt: moment().unix() },
                        'event.end': { $gt: moment().unix() },
                    },
                },
                {
                    $sort: { 'block.blockHeight': 1 },
                },
                {
                    $group: {
                        _id: '$address.index',
                        doc: { $last: '$$ROOT' },
                    },
                },
                { $replaceRoot: { newRoot: '$doc' } },
            ]);
            res.json(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resDocs.map((r: any) => ({ ...r.event, address: r.address }))
            );
        } catch (err) {
            console.error(err);
            res.json(err).status(503);
        }
    });

    app.get('/auctions/ended/:account', async (req: Request, res: Response) => {
        try {
            const resDocs = await db.contractEvents.aggregate([
                {
                    $match: {
                        'event.type': 'AuctionUpdated',
                        'event.auction_state.name': 'NotSoldYet',
                        'event.end': { $lt: moment().unix() },
                        'event.highest_bidder': req.params.account,
                    },
                },
                {
                    $sort: { 'block.blockHeight': 1 },
                },
                {
                    $group: {
                        _id: '$address.index',
                        doc: { $last: '$$ROOT' },
                    },
                },
                { $replaceRoot: { newRoot: '$doc' } },
            ]);
            res.json(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                resDocs.map((r: any) => ({
                    ...r.event,
                    address: r.address,
                }))
            );
        } catch (err) {
            console.error(err);
            res.json(err).status(503);
        }
    });

    return app;
})()
    .then((app) => {
        app.listen(port, function () {
            console.log(`App is listening on port ${port} !`);
        });
    })
    .catch((err) => console.error(err));

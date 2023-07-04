import express, { Application, Request, Response } from 'express';
import * as dotenv from 'dotenv';
import { default as cors } from 'cors';
import getDb, { getHighestBlockHeight } from './db/db';
import moment from 'moment';
dotenv.config();

const port = process.env.APP_PORT || '';
const mongodbConnString = process.env.DB_CONN_STRING || '';
const pageSize = parseInt(process.env.PAGE_SIZE || '20');

(async () => {
    const db = await getDb(mongodbConnString);
    const app: Application = express();
    app.use(cors());
    app.use(express.json());

    app.get('/system/block-height', async (req: Request, res: Response) => {
        const blockHeight = await getHighestBlockHeight(db);
        res.json(blockHeight.toString());
    });

    app.get('/project-nft/contract-events/:txnHash', async (req: Request, res: Response) => {
        const { txnHash } = req.params;
        if (!txnHash) {
            res.json({ error: 'Invalid params' }).status(400);
            return;
        }

        const resDoc = await db.contractEvents.find({
            'transaction.hash': txnHash,
        });

        if (!resDoc || resDoc.length === 0) {
            res.status(404).json({ error: 'Not found' });
            return;
        }

        const events = resDoc.map((r) => r.event);
        res.status(200).json(events);
    });

    app.post('/project-nft/retirements', async (req: Request, res: Response) => {
        const reqBody = req.body as { index: string; subindex: string; owner?: string; page?: number };
        if (!reqBody?.index || !reqBody?.subindex) {
            res.status(400).json({ error: 'Invalid params' });
            return;
        }

        const page = Math.max(reqBody.page || 0, 0);
        const skip = page * pageSize;

        let events: any[] = [];
        if (reqBody.owner) {
            events = await db.contractEvents.find(
                {
                    'address.index': reqBody.index,
                    'address.subindex': reqBody.subindex,
                    'event.Retire.0.owner.Account.0': reqBody.owner,
                },
                null,
                { limit: pageSize, skip: skip, sort: { 'block.blockHeight': -1 } }
            );
        } else {
            events = await db.contractEvents.find(
                {
                    'address.index': reqBody.index,
                    'address.subindex': reqBody.subindex,
                    'event.Retire.0.owner.Account.0': { $exists: true },
                },
                null,
                { limit: pageSize, skip: skip, sort: { 'block.blockHeight': -1 } }
            );
        }

        const retirements = events.map((e) => e.event);
        res.status(200).json(retirements);
    });

    app.get('/market/index/:index/subindex/:subindex/tokens', async (req: Request, res: Response) => {
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
    });

    return app;
})()
    .then((app) => {
        app.listen(port, function () {
            console.log(`App is listening on port ${port} !`);
        });
    })
    .catch((err) => console.error(err));

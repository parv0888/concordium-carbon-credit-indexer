import express, { Application, Request, Response } from "express";
import getDb from "./db";

const port = process.env.PORT || 3001;

const mongodbConnString =
    process.env.DB_CONN_STRING || "mongodb://root:example@localhost:27017/";

(async () => {
    const db = await getDb(mongodbConnString);
    const app: Application = express();

    app.get("/supply/index/:index/subindex/:subindex/token/:tokenId", async (req: Request, res: Response) => {
        try {
            var dbRes = await db.contractEvents.aggregate([
                {
                    $match: {
                        $or: [
                            { "event.Mint.token_id": req.params.tokenId },
                            { "event.Burn.token_id": req.params.tokenId },
                        ],
                        address: { index: req.params.index, subindex: req.params.subindex }
                    }
                },
                {
                    $project: {
                        amount: {
                            $cond: {
                                if: "$event.Mint",
                                then: "$event.Mint.amount",
                                else: {
                                    $cond: {
                                        if: "$event.Burn",
                                        then: { $multiply: ["$event.Burn,amount", -1] },
                                        else: 0
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        amount: { $sum: "$amount" }
                    }
                }
            ]).exec();
            res.json(dbRes[0].amount);

        } catch (err) {
            console.error(err);
            res.json(err).status(503);
        }


    });

    return app;
})().then((app) => {
    app.listen(port, function () {
        console.log(`App is listening on port ${port} !`);
    });
}).catch(err => console.error(err));

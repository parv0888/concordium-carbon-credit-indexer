import mongoose, { Schema, Model } from 'mongoose';
import { DbBlockEvent } from './cis2-event-types';

export type IBlock = {
    blockHeight: number;
    blockHash: string;
};

export type IContractEvent = DbBlockEvent<unknown>;

export type IDb = {
    blocks: Model<IBlock>;
    contractEvents: Model<IContractEvent>;
};

export default async function getDb(connString: string): Promise<IDb> {
    const client = await mongoose.connect(connString, {
        dbName: 'concordium-listener',
    });

    return {
        blocks: client.model(
            'blocks',
            new Schema<IBlock>(
                {
                    blockHeight: { type: Number, required: true },
                    blockHash: { type: String, required: true },
                },
                { strict: false }
            )
        ),
        contractEvents: client.model(
            'contractEvents',
            new Schema<IContractEvent>({}, { strict: false })
        ),
    };
}

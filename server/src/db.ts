import mongoose, { Schema, model, connect } from "mongoose";

export interface IBlock {
	blockHeight: number;
	blockHash: string;
}

export default async function getDb(connString: string) {
	const client = await mongoose.connect(connString, {
		dbName: "concordium-listener",
	});

	return {
		blocks: client.model(
			"blocks",
			new Schema<IBlock>(
				{
					blockHeight: { type: Number, required: true },
					blockHash: { type: String, required: true },
				},
				{ strict: false }
			)
		),
		contractEvents: client.model(
			"contractEvents",
			new Schema({}, { strict: false })
		),
	};
}

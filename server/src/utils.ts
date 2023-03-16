import { ContractAddress } from "@concordium/node-sdk";
import { Cis2BurnEvent, Cis2Event, Cis2MintEvent, Cis2TransferEvent, DbCis2BurnEvent, DbCis2Event, DbCis2MintEvent, DbCis2TransferEvent } from './cis2EventTypes';

export var toContractNameFromInitName = (initName: String) => {
    return initName.replace("init_", "");
};

export var toDbContractAddress = (address: ContractAddress) => {
    return {
        index: address.index.toString(),
        subindex: address.subindex.toString()
    };
};

export var toContractNameFromReceiveName = (name: string) => {
    return name.split(".")[0];
};

export const toDbEvent = (event: Cis2Event): DbCis2Event => {
    const key = Object.keys(event)[0];
    switch (key) {
        case "Mint":
            return {
                ...event,
                Mint: {
                    ...(event as Cis2MintEvent).Mint,
                    amount: parseInt((event as Cis2MintEvent).Mint.amount)
                }
            } as DbCis2MintEvent;
        case "Transfer":
            return {
                ...event,
                Transfer: {
                    ...(event as Cis2TransferEvent).Transfer,
                    amount: parseInt((event as Cis2TransferEvent).Transfer.amount)
                }
            } as DbCis2TransferEvent;

        case "Burn":
            return {
                ...event,
                Burn: {
                    ...(event as Cis2BurnEvent).Burn,
                    amount: parseInt((event as Cis2BurnEvent).Burn.amount)
                }
            } as DbCis2BurnEvent;
        default:
        case "UpdateOperator":
        case "TokenMetadata":
            return event as DbCis2Event;
    }
};

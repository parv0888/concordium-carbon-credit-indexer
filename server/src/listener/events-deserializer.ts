import { deserializeEventValue } from 'server-rust-bindings';
import {
    toContractNameFromInitName,
    toContractNameFromReceiveName,
} from '../utils';

export const deserializeUpdateContractEvents = (
    contractEvents: string[],
    schema: string,
    receiveName: string
): unknown[] => {
    return deserializeContractEvents(
        contractEvents,
        schema,
        toContractNameFromReceiveName(receiveName)
    );
};

export const deserializeInitContractEvents = (
    contractEvents: string[],
    schema: string,
    initName: string
): unknown[] => {
    return deserializeContractEvents(
        contractEvents,
        schema,
        toContractNameFromInitName(initName)
    );
};

export const deserializeContractEvents = (
    contractEvents: string[],
    schema: string,
    contractName: string
): unknown[] => {
    return contractEvents.map((e) =>
        deserializeContractEvent(e, schema, contractName)
    );
};

const deserializeContractEvent = (
    contractEvent: string,
    schema: string,
    contractName: string
): unknown => {
    console.log(
        `deserializing event contract name:${contractName}, eventHex: ${contractEvent}, schema: ${schema}`
    );
    const eventJson = deserializeEventValue(
        contractEvent,
        schema,
        contractName,
        3
    );

    // If an error os thrown here. It means there is some issue with the deserialization.
    return JSON.parse(eventJson);
};

import { ContractAddress } from '@concordium/node-sdk';

export const toContractNameFromInitName = (initName: string): string =>
    initName.replace('init_', '');

export const toDbContractAddress = (
    address: ContractAddress
): { index: string; subindex: string } => ({
    index: address.index.toString(),
    subindex: address.subindex.toString(),
});

export const toContractNameFromReceiveName = (name: string): string =>
    name.split('.')[0];

import {
    TransactionEventTag,
    TransactionKindString,
    TransactionSummaryType,
} from '@concordium/node-sdk';

export type DbEvent<T> = {
    event: T;
    eventType: TransactionEventTag;
    address: { index: string; subindex: string };
};

export type DbTransactionEvent<T> = DbEvent<T> & {
    transaction: {
        hash: string;
        transactionIndex: string;
        blockItemType: TransactionSummaryType;
        transactionType: TransactionKindString;
    };
};

export type DbBlockEvent<T> = DbTransactionEvent<T> & {
    block: {
        blockHash: string;
        blockHeight: number;
    };
};

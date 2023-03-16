export type Address = { Account: string[]; } | { Contract: { index: string, subindex: string; }; };
export type Cis2Event = Cis2TransferEvent | Cis2MintEvent | Cis2TokenMetadataEvent | Cis2BurnEvent | UpdateOperatorEvent;
export type DbCis2Event = DbCis2TransferEvent | DbCis2MintEvent | DbCis2TokenMetadataEvent | DbCis2BurnEvent | DbUpdateOperatorEvent;

export type Cis2TransferEvent = {
    Transfer: {
        token_id: string,
        amount: string,
        from: Address,
        to: Address;
    };
};

export type DbCis2TransferEvent = {
    Transfer: {
        token_id: string,
        amount: number,
        from: Address,
        to: Address;
    };
};

export type Cis2MintEvent = {
    Mint: {
        amount: string,
        owner: Address;
        token_id: string;
    };
};

export type DbCis2MintEvent = {
    Mint: {
        amount: number,
        owner: Address;
        token_id: string;
    };
};

export type Cis2TokenMetadataEvent = {
    TokenMetadata: {
        metadata_url: {
            hash?: { Some: number[][]; },
            url: string;
        },
        token_id: string;
    };
};

export type DbCis2TokenMetadataEvent = Cis2TokenMetadataEvent;

export type Cis2BurnEvent = {
    Burn: {
        amount: string,
        owner: Address;
        token_id: string;
    };
};

export type DbCis2BurnEvent = {
    Burn: {
        amount: number,
        owner: Address;
        token_id: string;
    };
};

export type UpdateOperatorEvent = {
    UpdateOperator: {
        update: { Remove?: {}, Add?: {}; },
        owner: Address,
        operator: Address;
    };
};

export type DbUpdateOperatorEvent = UpdateOperatorEvent;

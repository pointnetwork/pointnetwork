// Terminology follows EIP-2255.
export type PermissionRecord = {
    id: string; // hash(invoker + account)
    invoker: string; // dapp domain
    parentCapabilities: string[]; // allowed RPC methods
    account: string; // wallet address
};

export type PendingTx = {
    params: unknown[];
    network: string;
};

export type Log = {
    address: string
    topics: string[]
    data: string
    blockNumber: string
    transactionHash: string
    transactionIndex: string
    blockHash: string
    logIndex: string
    removed: boolean
}

export type EventLog = {
    contractIdentity: string;
    contractName: string;
    eventName: string;
    blockNumber: number;
    timestamp: number | null;
    data: Record<string, unknown>;
}

export type AbiItemInput = {
    indexed?: boolean
    internalType: string
    name: string
    type: string
}

export type AbiItem = {
    anonymous: boolean
    inputs: AbiItemInput[]
    name: string
    type: string
}

export type NotificationSubscription = {
  contractIdentity: string;
  contractName: string;
  contractAddress: string;
  eventName: string;
  filters?: Array<string | null>;
}

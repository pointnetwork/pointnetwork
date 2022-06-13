import {Wallet} from 'ethers';

type RecoveryObject = {
    v: number;
    r: Bytes;
    s: Bytes;
};

type ChainName = string;
type ContractName = string;
type ContractMethodName = string;
type Target = string;
type Version = string;
type ContractVersion = string;

type Domain = string;

type Identity = string;

type EventName = string;

type Address = string;

type NetworkName = string;

type NetworkConfig = {
    type: string;
    address: string;
    currenty_name: string;
    currency_code: string;
};

type ProviderInstance = {
    wallet: Wallet;
    provider: JsonRpcProvider | WebSocketProvider;
};

type NetworkConfigs = Record<NetworkName, NetworkConfig>;

type ProvidersList = Record<NetworkName, ProviderInstance>;

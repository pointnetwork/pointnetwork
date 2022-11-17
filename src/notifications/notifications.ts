import axios from 'axios';
import {BigNumber} from 'ethers';
import {keccak256, Interface, parseBytes32String} from 'ethers/lib/utils';
import {CacheFactory} from '../util';
import ethereum from '../network/providers/ethereum';
import {getNetworkAddress} from '../wallet/keystore';
import type {AbiItem, AbiItemInput, Log, EventLog, NotificationSubscription} from './types';

class Notifications {
    private ETH_PROVIDER_URL: string;
    private abis: CacheFactory<string, AbiItem[]>;
    private eventSignatures: CacheFactory<string, {contractName: string, eventName: string}>;
    private filters: CacheFactory<string, string>;

    constructor(expirationSecs: number) {
        this.ETH_PROVIDER_URL = 'https://rpc-mainnet-1.point.space'; // TODO: get from config
        this.abis = new CacheFactory<string, AbiItem[]>(expirationSecs * 1_000);
        this.filters = new CacheFactory<string, string>(expirationSecs * 1_000);
        this.eventSignatures = new CacheFactory<
            string,
            {contractName: string, eventName: string}
        >(expirationSecs * 1_000);
    }

    private toHex(n: number): string {
        return `0x${n.toString(16)}`;
    }

    private fromHex(h: string): number {
        return parseInt(h, 16);
    }

    private abiCacheKey(contractIdentity: string, contractName: string): string {
        return `${contractIdentity}:${contractName}`;
    }

    private async getABI(
        contractIdentity: string,
        contractName: string
    ): Promise<AbiItem[] | null> {
        const key = this.abiCacheKey(contractIdentity, contractName);
        if (!this.abis.has(contractName)) {
            try {
                const {_jsonInterface} = await ethereum.loadWebsiteContract(
                    contractIdentity,
                    contractName
                );
                this.abis.add(key, _jsonInterface);
            } catch (err) {
                throw new Error(`ABI for "${contractName}" not found. Error: ${err.message}`);
            }
        }
        return this.abis.get(key);
    }

    private async getEventDefinition(
        contractIdentity: string,
        contractName: string,
        eventName: string
    ): Promise<AbiItem> {
        const abi = await this.getABI(contractIdentity, contractName);
        const def = abi?.find((i: AbiItem) => i.type === 'event' && i.name === eventName);
        if (!def) {
            throw new Error(`Event ${eventName} not found in ABI.`);
        }
        return def;
    }

    private async getEventSignature(
        contractIdentity: string,
        contractName: string,
        eventName: string
    ): Promise<string> {
        const def = await this.getEventDefinition(contractIdentity, contractName, eventName);
        const inputTypes = def.inputs.map(i => i.type);
        const signature = `${eventName}(${inputTypes.join(',')})`;
        const hashedSignature = keccak256(Buffer.from(signature));
        this.eventSignatures.add(hashedSignature, {contractName, eventName});
        return hashedSignature;
    }

    private async getFilter(
        from: number,
        to: number,
        addresses: string[],
        topics: Array<string | null | string[]>
    ): Promise<string> {
        const key = addresses.join(':');
        if (this.filters.has(key)) {
            return this.filters.get(key)!;
        }

        // TODO: interaction with blockchain should be through src/network/providers/ethereum.js
        // Create filter
        const {data} = await axios.post(this.ETH_PROVIDER_URL, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_newFilter',
            params: [
                {
                    fromBlock: this.toHex(from),
                    toBlock: this.toHex(to),
                    address: addresses,
                    topics
                }
            ]
        });

        if (data.error || !data.result) {
            throw new Error(data.error ? JSON.stringify(data.error) : 'No filter ID returned.');
        }

        const filterId = data.result;
        this.filters.add(key, filterId);
        return filterId;
    }

    private async getPastLogs(
        from: number,
        to: number,
        addresses: string[],
        topics: Array<string | null | string[]>
    ): Promise<Log[]> {
        const filterId = await this.getFilter(from, to, addresses, topics);

        // TODO: interaction with blockchain should be through src/network/providers/ethereum.js
        const {data} = await axios.post(this.ETH_PROVIDER_URL, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_getFilterLogs',
            params: [filterId]
        });

        if (data.error) {
            throw new Error(JSON.stringify(data.error));
        }

        const events = data?.result ? data.result : [];
        return events;
    }

    private padTo64(addr: string): string {
        // 66 instead of 64 to account for the leading `0x`.
        const padding = new Array(66 - addr.length).fill('0');
        return `0x${padding.join('')}${addr.slice(2)}`;
    }

    private async loadUserSubscriptions(): Promise<NotificationSubscription[]> {
        // TODO: get from database
        const socialSubscription: NotificationSubscription = {
            contractIdentity: 'social.point',
            contractName: 'PointSocial',
            contractAddress: '0xF750B8F0988e4FA1c674C7CF9cEda27EBAc621C8',
            eventName: 'StateChange',
            // TODO: use this as the starting point (fromBlock),
            // user should not be notified about events prior to the subscription.
            blockAtTimeOfSubscription: 0
        };
        const emailSubscription: NotificationSubscription = {
            contractIdentity: 'email.point',
            contractName: 'PointEmail',
            contractAddress: '0x64E6F6fBd7a9B84de5fD580d23cEDb2CA4b2b63b',
            eventName: 'RecipientAdded',
            blockAtTimeOfSubscription: 0,
            filters: [this.padTo64(getNetworkAddress())] // address of the current user
        };
        return [socialSubscription, emailSubscription];
    }

    private async parseInputs(
        inputs: AbiItemInput[],
        topics: string[],
        contractIdentity: string,
        contractName: string,
        data: string
    ): Promise<Record<string, string | number>> {
        const abi = await this.getABI(contractIdentity, contractName);
        if (!abi) {
            throw new Error(`ABI for "${contractName}" not found.`);
        }

        const iface = new Interface(abi);
        const parsedLog = iface.parseLog({topics, data});
        const decoded: Record<string, string | number> = {};

        inputs.forEach((input, idx) => {
            let value = parsedLog.args[idx];
            if (value._isBigNumber) {
                value = BigNumber.from(value).toString();
            }
            if (input.type === 'bytes32') {
                value = parseBytes32String(value);
            }
            decoded[input.name] = value;
        });

        return decoded;
    }

    private getTimestamp(data: Record<string, string | number>): number | null {
        if ('timestamp' in data && !Number.isNaN(Number(data.timestamp))) {
            return Number(data.timestamp) * 1_000;
        }
        if ('date' in data && !Number.isNaN(Number(data.date))) {
            return Number(data.date) * 1_000;
        }
        return null;
    }

    private async parseLogs(subs: NotificationSubscription, logs: Log[]): Promise<EventLog[]> {
        const parsedLogs: EventLog[] = [];
        for (const l of logs) {
            if (!l.removed) {
                const {contractIdentity, contractName, eventName} = subs;
                const def = await this.getEventDefinition(
                    contractIdentity,
                    contractName,
                    eventName
                );
                const parsedTopicsAndData = await this.parseInputs(
                    def.inputs,
                    l.topics,
                    contractIdentity,
                    contractName,
                    l.data
                );
                parsedLogs.push({
                    contractIdentity: subs.contractIdentity,
                    contractName,
                    eventName,
                    blockNumber: this.fromHex(l.blockNumber),
                    data: parsedTopicsAndData,
                    timestamp: this.getTimestamp(parsedTopicsAndData)
                });
            }
        }
        return parsedLogs;
    }

    public async loadUserSubscriptionsAndGetLogs(): Promise<EventLog[]> {
        // TODO: get latest block and make paginated requests.
        const from = 4_047_400;
        const to = 4_047_650;

        const result: EventLog[] = [];
        const subscriptions = await this.loadUserSubscriptions();

        for (const s of subscriptions) {
            const eventSignature = await this.getEventSignature(
                s.contractIdentity,
                s.contractName,
                s.eventName
            );
            const topics = s.filters ? [eventSignature, ...s.filters] : [eventSignature];
            const logs = await this.getPastLogs(from, to, [s.contractAddress], topics);
            const parsedLogs = await this.parseLogs(s, logs);
            result.push(...parsedLogs);
        }

        // TODO: save logs to database.
        // TODO: make subscription to receive future events.

        return result;
    }
}

const EXPIRATION_SECS = 2 * 60;
export default new Notifications(EXPIRATION_SECS);

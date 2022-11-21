import {BigNumber} from 'ethers';
import {keccak256, Interface, parseBytes32String} from 'ethers/lib/utils';
import config from 'config';
import {CacheFactory} from '../util';
import ethereum from '../network/providers/ethereum';
import {getNetworkAddress} from '../wallet/keystore';
import type {AbiItem, AbiItemInput, Log, NotificationSubscription} from './types';
import Notification from '../db/models/notification';
import logger from '../core/log';

const log = logger.child({module: 'Notifications'});

const GET_LOGS_BLOCK_RANGE = config.get('network.get_logs_block_range') as number;

class Notifications {
    private abis: CacheFactory<string, AbiItem[]>;
    private eventSignatures: CacheFactory<string, {contractName: string, eventName: string}>;

    constructor(expirationSecs: number) {
        this.abis = new CacheFactory<string, AbiItem[]>(expirationSecs * 1_000);
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
        const filterId = await ethereum.forward('eth_newFilter', [{
            fromBlock: this.toHex(from),
            toBlock: this.toHex(to),
            address: addresses,
            topics
        }]);
        return filterId;
    }

    private async getPastLogs(
        from: number,
        to: number,
        addresses: string[],
        topics: Array<string | null | string[]>
    ): Promise<Log[]> {
        const filterId = await this.getFilter(from, to, addresses, topics);
        const events = await ethereum.forward('eth_getFilterLogs', [filterId]);
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
            blockAtTimeOfSubscription: 4_043_000,
            filters: [
                null,
                // Filter by creators
                [
                    this.padTo64('0x6479c4f0926f73e5509b9f24c85915d140e9382b'),
                    this.padTo64('0x5D8F10BbC99665c47d28C9181EBaa7b78be606D1')
                ]
            ]
        };
        const emailSubscription: NotificationSubscription = {
            contractIdentity: 'email.point',
            contractName: 'PointEmail',
            contractAddress: '0x64E6F6fBd7a9B84de5fD580d23cEDb2CA4b2b63b',
            eventName: 'RecipientAdded',
            blockAtTimeOfSubscription: 4_100_000,
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

    private async parseAndSaveLogs(
        s: NotificationSubscription,
        logs: Log[]
    ): Promise<Notification[]> {
        const parsedLogs: Notification[] = [];
        for (const l of logs) {
            if (!l.removed) {
                const {contractIdentity, contractName, contractAddress, eventName} = s;
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

                try {
                    const notification = await new Notification({
                        identity: contractIdentity,
                        contract: contractName,
                        address: contractAddress,
                        event: eventName,
                        block_number: this.fromHex(l.blockNumber),
                        arguments: parsedTopicsAndData,
                        timestamp: this.getTimestamp(parsedTopicsAndData),
                        viewed: false,
                        log: l
                    }).save();
                    parsedLogs.push(notification);
                } catch (err) {
                    log.error(err, 'Error saving notificaiton to database');
                }
            }
        }
        return parsedLogs;
    }

    private async getLogsForSubscription(
        s: NotificationSubscription,
        from: number,
        to: number
    ): Promise<Notification[]> {
        const eventSignature = await this.getEventSignature(
            s.contractIdentity,
            s.contractName,
            s.eventName
        );
        const topics = s.filters ? [eventSignature, ...s.filters] : [eventSignature];
        const logs = await this.getPastLogs(from, to, [s.contractAddress], topics);
        const parsedLogs = await this.parseAndSaveLogs(s, logs);
        return parsedLogs;
    }

    /**
     * Returns all unread notifications from local database.
     */
    public loadUnread(): Promise<Notification[]> {
        return Notification.findAll({
            where: {viewed: false},
            order: [['block_number', 'DESC']]
        });
    }

    /**
     * Returns a block range to be used in paginated requests to fetch notifications.
     */
    public async getBlockRange(): Promise<{from: number, to: number}> {
        // TODO: optimize this becaues we will load subscriptions again in `loadUserSubscriptionsAndGetLogs`.
        const subscriptions = await this.loadUserSubscriptions();

        let from: number;
        const lastEntry = await Notification.findOne({order: [['block_number', 'DESC']]});
        if (lastEntry) {
            // If there's a notification in the database, we'll start scanning from the next block.
            // TODO: optimize by storing and using the latest scanned block, not the latest block with events.
            from = Number(lastEntry.get('block_number')) + 1;
        } else {
            // For now, we will use the earliest block for all subscriptions,
            // but we should refine this so that each subscription uses it's own `fromBlock`.
            subscriptions.forEach(s => {
                if (from === undefined || s.blockAtTimeOfSubscription < from) {
                    from = s.blockAtTimeOfSubscription;
                }
            });
        }

        const to = from! + GET_LOGS_BLOCK_RANGE;
        return {from: from!, to};
    }

    /**
     * Fetches new notifications from blockchain, stores them in local database and returns them.
     * It uses pagination, more than 1 request may be needed to scan all corresponding blocks.
     *
     * TODO: make subscription to receive future events.
     */
    public async loadUserSubscriptionsAndGetLogs(
        from: number,
        to: number
    ): Promise<Notification[]> {
        // Ensure block range stays within the allowed limit.
        to = to <= from + GET_LOGS_BLOCK_RANGE ? to : from + GET_LOGS_BLOCK_RANGE;
        const subscriptions = await this.loadUserSubscriptions();
        const promises = subscriptions.map(s => this.getLogsForSubscription(s, from, to));
        const result = await Promise.all(promises);
        return result.flat(1);
    }
}

const EXPIRATION_SECS = 2 * 60;
export default new Notifications(EXPIRATION_SECS);

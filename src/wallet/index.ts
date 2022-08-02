import config from 'config';
import ethereum from '../network/providers/ethereum';
import {getNetworkAddress, getSolanaKeyPair} from './keystore';
import solana from '../network/providers/solana';
import {LAMPORTS_PER_SOL} from '@solana/web3.js';
import {utils} from 'ethers';
import pendingTxs from '../permissions/PendingTxs';
import {wsConnections} from '../client/proxy/handlers/common';
import {
    SUBSCRIPTION_EVENT_TYPES,
    SUBSCRIPTION_REQUEST_TYPES
} from '../api/sockets/ZProxySocketController';
import Web3 from 'web3';
const ERC20 = require('../abi/ERC20.json');
import {AbiItem} from 'web3-utils';

const networks: Record<string, {type: string; address: string}> = config.get('network.web3');

export const sendTransaction = async ({
    to,
    network = 'default',
    value,
    messageId
}: {
    to: string;
    network?: string;
    value: string;
    messageId: string;
}) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    let params: Record<string, string>[];

    switch (networks[network].type) {
        case 'eth':
            params = [{
                from: ethereum.getOwner(),
                to,
                value: utils.hexValue(value)
            }];
            break;
        case 'solana':
            params = [{
                to,
                lamports: value,
                network
            }];
            break;
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }

    const reqId = pendingTxs.add(params, network);

    Object.keys(wsConnections).forEach(key => {
        wsConnections[key].ws.send(JSON.stringify({
            request: {
                __hostname: 'point',
                __point_id: messageId,
                method: 'eth_sendTransaction',
                network,
                type: SUBSCRIPTION_REQUEST_TYPES.RPC,
                params
            },
            subscriptionId: null,
            type: SUBSCRIPTION_EVENT_TYPES.RPC,
            data: {reqId, params, network},
            status: 200
        }));
    });

    return {status: 200, result: {reqId, params, network}};
};

export const getBalance = async ({network = 'default', majorUnits = false}) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    switch (networks[network].type) {
        case 'eth':
            const balanceInWei = await ethereum.getBalance({
                address: getNetworkAddress(),
                network
            });
            return majorUnits ? balanceInWei / 1e18 : balanceInWei;
        case 'solana':
            const balanceInLamports = await solana.getBalance(network);
            return majorUnits ? balanceInLamports / LAMPORTS_PER_SOL : balanceInLamports;
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};

export const getTransactions = async ({network = 'default'}) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    switch (networks[network].type) {
        case 'eth':
            return ethereum.getTransactionsByAccount({
                account: getNetworkAddress(),
                network
            });
        case 'solana':
            const keypair = getSolanaKeyPair();

            return solana.getSignaturesForAddress({
                address: keypair.publicKey.toString(),
                network
            });
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};

export const getWalletAddress = ({network = 'default'}) => {
    switch (networks[network].type) {
        case 'eth':
            return getNetworkAddress();
        case 'solana':
            return getSolanaKeyPair().publicKey;
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};

export const sendToken = async ({tokenAddress, to, network = 'default', value, messageId}: {
    tokenAddress: string,
    to: string,
    network?: string,
    value: string,
    messageId: string
}) => {

    const web3 = new Web3();
    const data = web3.eth.abi.encodeFunctionCall(
        ERC20.find((func: AbiItem) => func.name === 'transfer'), [to, utils.hexValue(value)]
    );

    const params = [{
        from: getWalletAddress({network}),
        to: tokenAddress,
        data
    }];

    const reqId = pendingTxs.add(params, network);

    Object.keys(wsConnections).forEach(key => {
        wsConnections[key].ws.send(JSON.stringify({
            request: {
                __hostname: 'point',
                __point_id: messageId,
                method: 'eth_sendTransaction',
                network,
                type: SUBSCRIPTION_REQUEST_TYPES.RPC,
                params
            },
            subscriptionId: null,
            type: SUBSCRIPTION_EVENT_TYPES.RPC,
            data: {reqId, params, network},
            status: 200
        }));
    });

    return {status: 200, result: {reqId, params, network}};
};

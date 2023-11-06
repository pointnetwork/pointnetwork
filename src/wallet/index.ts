import config from 'config';
const ethereum = require('../network/providers/ethereum');
import {getNetworkAddress, getSolanaKeyPair} from './keystore';
import solana from '../network/providers/solana';
import {LAMPORTS_PER_SOL} from '@solana/web3.js';
import {utils, BigNumber} from 'ethers';
import pendingTxs from '../permissions/PendingTxs';
import {wsConnections} from '../client/proxy/handlers/common';
import {
    SUBSCRIPTION_EVENT_TYPES,
    SUBSCRIPTION_REQUEST_TYPES
} from '../api/sockets/ZProxySocketController';
import Web3 from 'web3';
const ERC20 = require('../../src/abi/ERC20.json');
import {AbiItem} from 'web3-utils';
import logger from '../core/log';
const {_timeout} = require('../util');
import {formatUnits} from 'ethers/lib/utils';

const log = logger.child({module: 'wallet/index'});

const networks: Record<string, {type: string; http_address: string, currency_code: string, tokens: Record<string, {name: string, icon: string, address: string}>}> = config.get('network.web3');
const DEFAULT_NETWORK: string = config.get('network.default_network');

const DEFAULT_TIMEOUT = 20000;

export const sendTransaction = async ({
    to,
    network = DEFAULT_NETWORK,
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

export const getBalance = async ({network = DEFAULT_NETWORK, majorUnits = false}) => {
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

export const getTokenBalanceAndDecimals = async(network = DEFAULT_NETWORK, token: string, majorUnits = false) => {
    if (!networks[network]) {
        throw new Error(`Unknown network ${network}`);
    }

    const tokens = networks[network].tokens;

    // filter by token == tokens[...].name
    const tokenData = Object.values(tokens).find((t: {name: string}) => t.name.toLowerCase() === token.toLowerCase());
    
    // if token is not a key in network.tokens
    if (!tokenData) {
        throw new Error(`Unknown token ${token}`);
    }

    try {
        const web3 = new Web3();
        const decimalsCallData = web3.eth.abi.encodeFunctionCall(
            ERC20.find((func: AbiItem) => func.name === 'decimals'),
            []
        );
        const balanceOfCallData = web3.eth.abi.encodeFunctionCall(
            ERC20.find((func: AbiItem) => func.name === 'balanceOf'),
            [getWalletAddress({})]
        );

        const [_balance, _decimals] = await Promise.all([
            _timeout(
                ethereum.send({
                    method: 'eth_call',
                    params: [
                        {
                            from: getWalletAddress({}),
                            to: tokenData.address,
                            data: balanceOfCallData
                        },
                        'latest'
                    ],
                    id: new Date().getTime(),
                    network
                }),
                DEFAULT_TIMEOUT,
                'Timeout'
            ),
            _timeout(
                ethereum.send({
                    method: 'eth_call',
                    params: [
                        {
                            from: getWalletAddress({}),
                            to: tokenData.address,
                            data: decimalsCallData
                        },
                        'latest'
                    ],
                    id:
                        new Date().getTime() +
                        Math.round(Math.random() * 100000),
                    network
                }),
                DEFAULT_TIMEOUT,
                'Timeout'
            )
        ]);

        return {
            balance: majorUnits ? (formatUnits(BigNumber.from(_balance.result), BigNumber.from(_decimals.result)).toString()) : (BigNumber.from(_balance.result).toString()),
            decimals: BigNumber.from(_decimals.result).toNumber()
        };
    } catch (e) {
        throw new Error(`Failed to get token balance: ${e.message}`);
    }
};

export const getTransactions = async ({network = DEFAULT_NETWORK}) => {
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

export const getWalletAddress = ({network = DEFAULT_NETWORK}) => {
    switch (networks[network].type) {
        case 'eth':
            return getNetworkAddress();
        case 'solana':
            return getSolanaKeyPair().publicKey.toBase58();
        default:
            throw new Error(
                `Bad config: unexpected network ${network} type ${networks[network].type}`
            );
    }
};

export const sendToken = async ({tokenAddress, to, network = DEFAULT_NETWORK, value, messageId}: {
    tokenAddress: string,
    to: string,
    network?: string,
    value: string,
    messageId: string
}) => {

    // value = value.toString(); // to fix "value must be a string" error

    // const tokenDecimals = 18; // todo: get from contract/config
    log.info({value});
    // const valueScaled = utils.parseUnits(value, tokenDecimals);
    // log.info({valueScaled});
    const valueHex = utils.hexValue(value);
    log.info({valueHex});

    const web3 = new Web3();
    const data = web3.eth.abi.encodeFunctionCall(
        ERC20.find((func: AbiItem) => func.name === 'transfer'), [to, valueHex]
    );

    const txValue = 0;

    const params = [{
        from: getWalletAddress({network}),
        to: tokenAddress,
        data,
        value: utils.hexValue(txValue),
        beneficiary: to
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

    log.info({params});

    return {status: 200, result: {reqId, params, network}};
};

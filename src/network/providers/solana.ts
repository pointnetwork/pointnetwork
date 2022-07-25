import * as web3 from '@solana/web3.js';
import {
    getHashedName,
    getNameAccountKey,
    NameRegistryState,
    updateNameRegistryData,
    performReverseLookup,
    getFavoriteDomain,
    getAllDomains
} from '@bonfida/spl-name-service';
import {getSolanaKeyPair} from '../../wallet/keystore';
import config from 'config';
import axios from 'axios';
import {DomainRegistry} from '../../name_service/types';
const logger = require('../../core/log');
const log = logger.child({module: 'SolanaProvider'});

// Address of the `.sol` TLD
const SOL_TLD_AUTHORITY = new web3.PublicKey(config.get('name_services.sol_tld_authority'));

export type SolanaSendFundsParams = {to: string; lamports: number; network: string};

// These interfaces are copied from @solana/web3
// However, they are not exported in index file, and trying to import them leads to
// a bunch of ts errors in other library files
export interface TransactionJSON {
    recentBlockhash: string | null;
    feePayer: string | null;
    nonceInfo: {
        nonce: string;
        nonceInstruction: TransactionInstructionJSON;
    } | null;
    instructions: TransactionInstructionJSON[];
    signers: string[];
}

interface TransactionInstructionJSON {
    keys: {
        pubkey: string;
        isSigner: boolean;
        isWritable: boolean;
    }[];
    programId: string;
    data: number[];
}

const createSolanaConnection = (blockchainUrl: string, protocol = 'https') => {
    const url = `${protocol}://${blockchainUrl}`;
    const connection = new web3.Connection(url, 'confirmed');
    log.debug({blockchainUrl}, 'Created solana instance');
    return connection;
};

const networks: Record<string, {type: string; http_address: string}> = config.get('network.web3');
const providers: Record<string, {connection: web3.Connection; wallet: web3.Keypair}> = Object.keys(
    networks
)
    .filter(key => networks[key].type === 'solana')
    .reduce(
        (acc, cur) => ({
            ...acc,
            [cur]: {
                connection: createSolanaConnection(networks[cur].http_address),
                wallet: getSolanaKeyPair()
            }
        }),
        {}
    );

const instructionFromJson = (json: TransactionInstructionJSON): web3.TransactionInstruction => ({
    keys: json.keys.map(({pubkey, isSigner, isWritable}) => ({
        pubkey: new web3.PublicKey(pubkey),
        isSigner,
        isWritable
    })),
    programId: new web3.PublicKey(json.programId),
    data: Buffer.from(json.data)
});

/**
 * Helper function to create a transaction from an array of instructions,
 * sign it, and send it.
 *
 * The first signer in the array of signers is going to be the fee payer.
 *
 * Quite similar to the `solana.signAndSendTransaction` method, but more
 * convenient to use when you already have one or more properly structured
 * `instruction`s.
 */
const sendInstructions = async (
    connection: web3.Connection,
    signers: web3.Keypair[],
    instructions: web3.TransactionInstruction[]
): Promise<string> => {
    const tx = new web3.Transaction();
    tx.feePayer = signers[0].publicKey;
    tx.add(...instructions);
    const txId = await connection.sendTransaction(tx, signers, {preflightCommitment: 'single'});
    return txId;
};

const solana = {
    requestAccount: async (id: number, network: string) => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network ${network}`);
        }
        return {
            jsonrpc: '2.0',
            result: {publicKey: provider.wallet.publicKey.toString()},
            id
        };
    },
    signAndSendTransaction: async (id: number, txProps: TransactionJSON, network: string) => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network ${network}`);
        }
        const {connection, wallet} = provider;
        const transaction = new web3.Transaction();

        if (txProps.recentBlockhash) {
            transaction.recentBlockhash = txProps.recentBlockhash;
        }
        if (txProps.feePayer) {
            transaction.feePayer = new web3.PublicKey(txProps.feePayer);
        }
        if (txProps.nonceInfo) {
            transaction.nonceInfo = {
                nonce: txProps.nonceInfo.nonce,
                nonceInstruction: instructionFromJson(txProps.nonceInfo.nonceInstruction)
            };
        }
        transaction.instructions = txProps.instructions.map(instr => instructionFromJson(instr));
        transaction.signatures = txProps.signers.map(s => ({
            signature: null,
            publicKey: new web3.PublicKey(s)
        }));

        const hash = await web3.sendAndConfirmTransaction(connection, transaction, [wallet]);

        return {
            jsonrpc: '2.0',
            result: hash,
            id
        };
    },
    send: async ({
        method,
        params = [],
        id = new Date().getTime(),
        network
    }: {
        method: string;
        params?: unknown[];
        id?: number;
        network: string;
    }) => {
        const blockchainUrl = networks[network];
        if (!blockchainUrl) {
            throw new Error(`Unknown network ${network}`);
        }
        if (blockchainUrl.type !== 'solana') {
            throw new Error(`Wrong network type for ${network}, solana expected`);
        }
        const res = await axios.post(
            blockchainUrl.http_address,
            {method, params, id, jsonrpc: '2.0'},
            {validateStatus: () => true}
        );
        if (res.status !== 200) {
            throw new Error(
                `RPC call failed with status ${res.status}: ${JSON.stringify(res.data)}`
            );
        }
        return res.data;
    },
    sendFunds: async ({to, lamports, network}: SolanaSendFundsParams) => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network ${network}`);
        }
        const {connection, wallet} = provider;

        const toPubkey = new web3.PublicKey(to);

        const transaction = new web3.Transaction();
        transaction.add(
            web3.SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey,
                lamports
            })
        );

        return web3.sendAndConfirmTransaction(connection, transaction, [wallet]);
    },
    getBalance: async (network: string) => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network ${network}`);
        }
        const {connection, wallet} = provider;

        return connection.getBalance(wallet.publicKey);
    },
    getSignaturesForAddress: async ({
        address,
        network,
        before,
        until,
        limit = 1
    }: {
        address: string;
        network: string;
        before?: string;
        until?: string;
        limit?: number;
    }) => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network ${network}`);
        }
        const {connection} = provider;

        const pubKey = new web3.PublicKey(address);

        return connection.getSignaturesForAddress(pubKey, {before, until, limit});
    },
    resolveDomain: async (domainName: string, network = 'solana'): Promise<DomainRegistry> => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network "${network}".`);
        }

        // Domain without the `.sol`
        const domain = domainName.endsWith('.sol') ? domainName.replace(/.sol$/, '') : domainName;
        const hashed = await getHashedName(domain);
        const key = await getNameAccountKey(hashed, undefined, SOL_TLD_AUTHORITY);
        const {registry} = await NameRegistryState.retrieve(provider.connection, key);
        const content = registry.data?.toString().replace(/\x00/g, '');

        return {
            owner: registry.owner.toBase58(),
            content: content || null
        };
    },
    /**
     * Retrieve the `.sol` domain owned by `owner`.
     *
     * If a favourite domain exists, it is returned.
     * Otherwise, all domains owned by `owner` are retrieved and the first one is returned.
     */
    getDomain: async (owner: web3.PublicKey, network = 'solana'): Promise<string | null> => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network "${network}".`);
        }

        try {
            // Check if the owner has a favourite domain.
            const {reverse} = await getFavoriteDomain(provider.connection, owner);
            log.debug({owner: owner.toBase58(), domain: reverse}, 'Favourite domain found.');
            return `${reverse}.sol`;
        } catch (err) {
            // There's no favourite domain, retrieve them all and pick the first one.
            // TODO: if there is more than 1 domain, ask the user to pick one.
            const domains = await getAllDomains(provider.connection, owner);
            if (domains.length > 0) {
                const domainName = await performReverseLookup(provider.connection, domains[0]);
                log.debug(
                    {owner: owner.toBase58(), numDomains: domains.length, firstDomain: domainName},
                    'Domains found.'
                );
                return `${domainName}.sol`;
            }

            log.debug({owner: owner.toBase58()}, 'No domains found.');
            return null;
        }
    },
    setDomainContent: async (domainName: string, data: string, network = 'solana') => {
        const provider = providers[network];
        if (!provider) {
            throw new Error(`Unknown network "${network}".`);
        }

        const {connection, wallet} = provider;
        const domain = domainName.endsWith('.sol') ? domainName.replace(/.sol$/, '') : domainName;
        const offset = 0;
        const buf = Buffer.from(data);
        const buffers = [buf, Buffer.alloc(1_000 - buf.length)];

        const instruction = await updateNameRegistryData(
            provider.connection,
            domain,
            offset,
            Buffer.concat(buffers),
            undefined,
            SOL_TLD_AUTHORITY
        );

        const txId = await sendInstructions(connection, [wallet], [instruction]);
        return txId;
    },
    isAddress: (address: string) => {
        try {
            return web3.PublicKey.isOnCurve(address);
        } catch {
            return false;
        }
    },
    toPublicKey: (address: string) => new web3.PublicKey(address)
};

export default solana;

// To avoid error importing in JS files
module.exports = solana;

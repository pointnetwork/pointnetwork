import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from '@solana/web3.js';
import {
    getHashedName,
    getNameAccountKey,
    NameRegistryState,
    updateNameRegistryData
} from '@solana/spl-name-service';
import config from 'config';
import axios from 'axios';
import {JsonRpcResponse} from 'hardhat/types';
import {Provider, ChainId} from './provider';
import {DomainRegistry} from '../../name_service/types';
import {getSolanaKeyPair} from '../../wallet/keystore';
import logger from '../../core/log';
import {RPCRequest} from '../../rpc/rpc-handlers';
import {getNetworkConfig} from './utils';

const log = logger.child({module: 'SolanaProvider'});

// Address of the `.sol` TLD
const SOL_TLD_AUTHORITY = new PublicKey(config.get('name_services.sol_tld_authority'));

type SolanaSendFundsParams = {
    to: string;
    lamports: number;
};

// These interfaces are copied from @solana/web3
// However, they are not exported in index file, and trying to import them leads to
// a bunch of ts errors in other library files
interface TransactionInstructionJSON {
    keys: {
        pubkey: string;
        isSigner: boolean;
        isWritable: boolean;
    }[];
    programId: string;
    data: number[];
}
interface TransactionJSON {
    recentBlockhash: string | null;
    feePayer: string | null;
    nonceInfo: {
        nonce: string;
        nonceInstruction: TransactionInstructionJSON;
    } | null;
    instructions: TransactionInstructionJSON[];
    signers: string[];
}

interface SolanaConnection {
    conn: Connection;
    wallet: Keypair;
}

/**
 * Singleton class to make calls and send transactions to Solana blockchain.
 * With potential support for multiple chains (mainnet, devnet, etc.).
 */
class SolanaProvider implements Provider {
    private static instance: SolanaProvider;

    // Lazily instantiated web3 providers to interact with different Solana chains.
    private chains: {[key in ChainId]?: SolanaConnection} = {};

    private constructor() {}

    public static getInstance() {
        if (!SolanaProvider.instance) {
            SolanaProvider.instance = new SolanaProvider();
        }
        return SolanaProvider.instance;
    }

    /**
     * Creates a connection to a Solana web3 provider.
     *
     * As long as we have a provider URL in the config for the given chain.
     * Otherwise, it throws an error.
     */
    private createConnection(chainId: ChainId): SolanaConnection {
        const network = getNetworkConfig(chainId);
        const host = network.address;
        const protocol = network.tls ? 'https' : 'http';
        const url = `${protocol}://${host}`;
        const conn = new Connection(url, 'confirmed');
        const wallet = getSolanaKeyPair();
        log.info({chainId, url}, 'Successfully created solana-web3 instance.');
        return {conn, wallet};
    }

    /**
     * Returns a provider for the given chain.
     * If one is not already available, it's created.
     */
    private getChainProvider(chainId: ChainId): SolanaConnection {
        if (!this.chains[chainId]) {
            this.chains[chainId] = this.createConnection(chainId);
        }
        return this.chains[chainId] as SolanaConnection;
    }

    public name(chainId: ChainId): string {
        return `SolanaProvider (chain: ${chainId})`;
    }

    /**
     * Helper function to create a transaction from an array of instructions, sign it, and send it.
     * The first signer in the array of signers is going to be the fee payer.
     */
    private async sendInstructions(
        connection: Connection,
        signers: Keypair[],
        instructions: TransactionInstruction[]
    ): Promise<string> {
        const tx = new Transaction();
        tx.feePayer = signers[0].publicKey;
        tx.add(...instructions);
        const txId = await connection.sendTransaction(tx, signers, {preflightCommitment: 'single'});
        return txId;
    }

    public async resolveDomain(chainId: ChainId, domainName: string): Promise<DomainRegistry> {
        const provider = this.getChainProvider(chainId);
        const domain = domainName.endsWith('.sol') ? domainName.replace(/.sol$/, '') : domainName;
        const hashed = await getHashedName(domain);
        const key = await getNameAccountKey(hashed, undefined, SOL_TLD_AUTHORITY);
        const registry = await NameRegistryState.retrieve(provider.conn, key);
        const content = registry.data?.toString().replace(/\x00/g, '');
        return {
            owner: registry.owner.toBase58(),
            content: content || null
        };
    }

    public async setDomainContent(
        chainId: ChainId,
        domainName: string,
        data: string
    ): Promise<Record<string, string | number | boolean>> {
        const provider = this.getChainProvider(chainId);
        const {conn, wallet} = provider;
        const domain = domainName.endsWith('.sol') ? domainName.replace(/.sol$/, '') : domainName;
        const offset = 0;
        const buf = Buffer.from(data);
        const buffers = [buf, Buffer.alloc(1_000 - buf.length)];

        const instruction = await updateNameRegistryData(
            conn,
            domain,
            offset,
            Buffer.concat(buffers),
            undefined,
            SOL_TLD_AUTHORITY
        );

        const txId = await this.sendInstructions(conn, [wallet], [instruction]);
        return {txId};
    }

    public async send(chainId: ChainId, data: RPCRequest): Promise<JsonRpcResponse> {
        const network = getNetworkConfig(chainId);
        const protocol = network.tls ? 'https' : 'http';
        const host = network.address;
        const url = `${protocol}://${host}`;
        const {id, method, params} = data;

        const res = await axios.post(
            url,
            {method, params, id, jsonrpc: '2.0'},
            {validateStatus: () => true}
        );

        if (res.status !== 200) {
            const errMsg = `RPC call failed with status ${res.status}: ${JSON.stringify(res.data)}`;
            log.error({chainId, method, url, resp: res.data}, errMsg);
            throw new Error(errMsg);
        }

        return res.data;
    }

    private instructionFromJson(json: TransactionInstructionJSON): TransactionInstruction {
        return {
            programId: new PublicKey(json.programId),
            data: Buffer.from(json.data),
            keys: json.keys.map(({pubkey, isSigner, isWritable}) => ({
                pubkey: new PublicKey(pubkey),
                isSigner,
                isWritable
            }))
        };
    }

    private async sendFunds(
        chainId: ChainId,
        reqId: number,
        {to, lamports}: SolanaSendFundsParams
    ): Promise<JsonRpcResponse> {
        const {conn, wallet} = this.getChainProvider(chainId);
        const fromPubkey = wallet.publicKey;
        const toPubkey = new PublicKey(to);
        const tx = new Transaction();
        tx.add(SystemProgram.transfer({fromPubkey, toPubkey, lamports}));
        const txid = await sendAndConfirmTransaction(conn, tx, [wallet]);
        return {
            jsonrpc: '2.0',
            id: reqId,
            result: txid
        };
    }

    public async sendTransaction(
        chainId: ChainId,
        reqId: number,
        txParams: unknown[]
    ): Promise<JsonRpcResponse> {
        if ((txParams[0] as SolanaSendFundsParams).to) {
            const {to, lamports} = txParams[0] as SolanaSendFundsParams;
            const resp = await this.sendFunds(chainId, reqId, {to, lamports});
            return resp;
        }

        const {
            recentBlockhash,
            feePayer,
            nonceInfo,
            instructions,
            signers
        } = txParams[0] as TransactionJSON;

        const {conn, wallet} = this.getChainProvider(chainId);
        const tx = new Transaction();

        if (recentBlockhash) {
            tx.recentBlockhash = recentBlockhash;
        }
        if (feePayer) {
            tx.feePayer = new PublicKey(feePayer);
        }
        if (nonceInfo) {
            tx.nonceInfo = {
                nonce: nonceInfo.nonce,
                nonceInstruction: this.instructionFromJson(nonceInfo.nonceInstruction)
            };
        }

        tx.instructions = instructions.map(i => this.instructionFromJson(i));

        tx.signatures = signers.map(s => ({
            signature: null,
            publicKey: new PublicKey(s)
        }));

        const txid = await sendAndConfirmTransaction(conn, tx, [wallet]);

        return {
            jsonrpc: '2.0',
            id: reqId,
            result: txid
        };
    }

    public async requestAccounts(chainId: ChainId, id: number): Promise<JsonRpcResponse> {
        const provider = this.getChainProvider(chainId);
        const publicKey = provider.wallet.publicKey.toString();
        return {
            jsonrpc: '2.0',
            id,
            result: {publicKey}
        };
    }
}

export default SolanaProvider;

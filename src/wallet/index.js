const fs = require('fs');
const events = require('events');
const solana = require('@solana/web3.js');
const config = require('config');
const logger = require('../core/log');
const log = logger.child({module: 'Wallet'});
const {getNetworkAddress, getSecretPhrase} = require('./keystore');
const blockchain = require('../network/blockchain');

class Wallet {
    static get TRANSACTION_EVENT() {
        return 'TRANSACTION_EVENT';
    }

    static get DEFAULT_GAS() {
        return 21000;
    }

    constructor(ctx) {
        this.ctx = ctx;
        // Events
        // transactionEventEmitter emits the TRANSACTION_EVENT type
        this.transactionEventEmitter = new events.EventEmitter();
    }

    async start() {
        this.solanaMainConnection = new solana.Connection(
            config.get('wallet.solana_main_endpoint'),
            'confirmed'
        );
        this.solanaDevConnection = new solana.Connection(
            config.get('wallet.solana_dev_endpoint'),
            'confirmed'
        );
        this.solanaDevStandardConnection = new solana.Connection(
            config.get('wallet.solana_dev_standard_endpoint'),
            'confirmed'
        );
        this.solanaTestConnection = new solana.Connection(
            config.get('wallet.solana_test_endpoint'),
            'confirmed'
        );

        this.initSolanaWallet();

        // todo: other setup?
    }

    initSolanaWallet() {
        const {Keypair} = require('@solana/web3.js');
        const bip39 = require('bip39');
        const bip32 = require('bip32');

        const derivePath = `m/44'/501'/0'/0`;

        const seed = bip39.mnemonicToSeedSync(getSecretPhrase()); // Buffer
        // also tried to slice seed.slice(0, 32);
        const derivedSeed = bip32.fromSeed(seed).derivePath(derivePath).privateKey;
        const keypair = Keypair.fromSeed(derivedSeed);

        this.solanaKeyPair = keypair;
        this.solanaAddress = keypair.publicKey.toString();
    }

    // get transactionEvents() {
    //     return this.transactionEventEmitter;
    // }

    saveDefaultWalletToKeystore() {
        // use the hard coded wallet id, passcode, address and private key to save to the nodes keystore
        const id = config.get('wallet.id');
        const passcode = config.get('wallet.passcode');
        const wallet = blockchain.getWallet();
        const keystore = wallet.encrypt(passcode);
        fs.writeFileSync(`${this.keystorePath}/${id}`, JSON.stringify(keystore));
    }

    async sendTransaction(from, to, value) {
        const receipt = await blockchain.sendTransaction({
            from,
            to,
            value,
            gas: Wallet.DEFAULT_GAS
        });
        this.transactionEventEmitter.emit(Wallet.TRANSACTION_EVENT, {
            transactionHash: receipt.transactionHash,
            from,
            to,
            value
        });
        return receipt;
    }

    generate(passcode) {
        const wallet = blockchain.createAccountAndAddToWallet();
        const keystore = this.saveWalletToKeystore(wallet, passcode);

        // TODO: remove
        this._fundWallet(account.address);

        return keystore.id;
    }

    saveWalletToKeystore(wallet, passcode) {
        const keystore = wallet.encrypt(passcode);
        fs.writeFileSync(`${this.keystorePath}/${keystore.id}`, JSON.stringify(keystore));

        return keystore;
    }

    loadWalletFromKeystore(walletId, passcode) {
        // todo what if it does not exist?
        if (fs.existsSync(`${this.keystorePath}/${walletId}`)) {
            const keystoreBuffer = fs.readFileSync(`${this.keystorePath}/${walletId}`);
            const keystore = JSON.parse(keystoreBuffer);
            return blockchain.decryptWallet(keystore, passcode);
        } else {
            return null;
        }
    }

    async getNetworkAccountBalanceInWei() {
        return await blockchain.getBalance(getNetworkAddress());
    }
    async getNetworkAccountBalanceInEth() {
        return (await this.getNetworkAccountBalanceInWei()) / 1e18;
    }

    async getHistoryForCurrency(code) {
        switch (code) {
            case 'NEON':
                return blockchain.getTransactionsByAccount(getNetworkAddress());
            default:
                throw Error('Unsupported currency: ' + code);
        }
    }

    getArweaveAccount() {
        log.debug(this.ctx, 'getArweaveAccount context');
        return 0;
    }
    getArweaveBalanceInAR() {
        return 0;
    }

    getSolanaAccount() {
        return this.solanaAddress;
        // const provider = new HDWalletProvider({
        //     mnemonic: this.getSecretPhrase(),
        //     // providerOrUrl: 'http://localhost:8545',
        //     // numberOfAddresses: 1,
        //     // shareNonce: true,
        //     derivationPath: 'm/44'/501'/0'/0''
        // });
        //
    }

    getSolanaPublicKey() {
        return new solana.PublicKey(this.getSolanaAccount());
    }

    async #getSolanaBalanceInSOLWithConnection(connection) {
        const solanaAddress = this.getSolanaPublicKey();
        const result = (await connection.getBalance(solanaAddress)) / 1e9;
        return result;
    }
    async getSolanaMainnetBalanceInSOL() {
        return this.#getSolanaBalanceInSOLWithConnection(this.solanaMainConnection);
    }
    async getSolanaDevnetBalanceInSOL() {
        return this.#getSolanaBalanceInSOLWithConnection(this.solanaDevConnection);
    }

    async initiateSolanaDevAirdrop() {
        const solanaAddress = this.getSolanaPublicKey();
        const signature = await this.solanaDevStandardConnection.requestAirdrop(
            solanaAddress,
            Number(solana.LAMPORTS_PER_SOL)
        );
        await this.solanaDevStandardConnection.confirmTransaction(signature);
    }

    async send(code, recipient, amount) {
        switch (code) {
            case 'devSOL':
            case 'SOL': {
                const transaction = new solana.Transaction().add(
                    solana.SystemProgram.transfer({
                        fromPubkey: this.getSolanaPublicKey(),
                        toPubkey: new solana.PublicKey(this.getSolanaAccount()),
                        lamports: amount / solana.LAMPORTS_PER_SOL
                    })
                );

                // Sign transaction, broadcast, and confirm
                await solana.sendAndConfirmTransaction(
                    code === 'SOL' ? this.solanaMainConnection : this.solanaDevConnection,
                    transaction,
                    [this.solanaKeyPair]
                );

                break;
            }
            case 'NEON':
                log.debug(
                    {
                        from: getNetworkAddress(),
                        to: recipient,
                        value: amount * 1e18,
                        gas: Wallet.DEFAULT_GAS
                    },
                    'Sending Neon tx'
                );
                await blockchain.sendTransaction({
                    from: getNetworkAddress(),
                    to: recipient,
                    value: amount * 1e18,
                    gas: Wallet.DEFAULT_GAS
                });
                break;
            default:
                throw Error('This currency is not supported yet');
        }
    }

    // todo: remove
    _fundWallet(_address) {
        blockchain.sendTransaction({
            from: this.network_account,
            to: _address,
            value: 1e18,
            gas: Wallet.DEFAULT_GAS
        });
    }
}

module.exports = Wallet;

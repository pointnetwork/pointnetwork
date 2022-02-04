const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const events = require('events');
const ethereumjs = require('ethereumjs-util');
const solana = require('@solana/web3.js');

// from: https://ethereum.stackexchange.com/questions/2531/common-useful-javascript-snippets-for-geth/3478#3478
async function getTransactionsByAccount(
    eth,
    myaccount,
    startBlockNumber,
    endBlockNumber,
    log = console
) {
    if (endBlockNumber == null) {
        endBlockNumber = await eth.getBlockNumber();
        log.debug({endBlockNumber}, 'Using endBlockNumber');
    }
    if (startBlockNumber == null) {
        startBlockNumber = Math.max(0, endBlockNumber - 1000000);
        log.debug({startBlockNumber}, 'Using startBlockNumber');
    }
    log.debug(
        {myaccount, startBlockNumber, endBlockNumber, ethblocknumber: eth.blockNumber},
        'Searching for transactions'
    );

    const txs = [];

    for (var i = startBlockNumber; i <= endBlockNumber; i++) {
        if (i % 1000 == 0) {
            log.debug('Searching block ' + i);
        }
        var block = eth.getBlock(i, true);
        if (block != null && block.transactions != null) {
            block.transactions.forEach(function (e) {
                if (myaccount == '*' || myaccount == e.from || myaccount == e.to) {
                    txs.push(e);
                    // log.debug('   tx hash         : ' + e.hash + '\n'
                    //         + '   nonce           : ' + e.nonce + '\n'
                    //         + '   blockHash       : ' + e.blockHash + '\n'
                    //         + '   blockNumber     : ' + e.blockNumber + '\n'
                    //         + '   transactionIndex: ' + e.transactionIndex + '\n'
                    //         + '   from            : ' + e.from + '\n'
                    //         + '   to              : ' + e.to + '\n'
                    //         + '   value           : ' + e.value + '\n'
                    //         + '   time            : ' + block.timestamp + ' ' + new Date(block.timestamp * 1000).toGMTString() + '\n'
                    //         + '   gasPrice        : ' + e.gasPrice + '\n'
                    //         + '   gas             : ' + e.gas + '\n'
                    //         + '   input           : ' + e.input);
                }
            });
        }

        log.debug({txs}, 'Accound transactions');
    }

    return txs;
}

class Wallet {
    static get TRANSACTION_EVENT() {
        return 'TRANSACTION_EVENT';
    }

    constructor(ctx) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'Wallet'});
        this.config = ctx.config.client.wallet;
        this.network_account = this.config.account;

        // Events
        // transactionEventEmitter emits the TRANSACTION_EVENT type
        this.transactionEventEmitter = new events.EventEmitter();
    }

    async start() {
        this.keystore_path = path.join(this.ctx.datadir, this.config.keystore_path);
        if (!fs.existsSync(this.keystore_path)) {
            mkdirp.sync(this.keystore_path);
        }

        this.solanaMainConnection = new solana.Connection(
            this.ctx.config.client.storage.solana_main_endpoint,
            'confirmed'
        );
        this.solanaDevConnection = new solana.Connection(
            this.ctx.config.client.storage.solana_dev_endpoint,
            'confirmed'
        );
        this.solanaDevStandardConnection = new solana.Connection(
            this.ctx.config.client.storage.solana_dev_standard_endpoint,
            'confirmed'
        );
        this.solanaTestConnection = new solana.Connection(
            this.ctx.config.client.storage.solana_test_endpoint,
            'confirmed'
        );

        this.initSolanaWallet();

        // todo: other setup?
    }

    initSolanaWallet() {
        const {Keypair} = require('@solana/web3.js');
        const bip39 = require('bip39');
        const bip32 = require('bip32');

        const derivePath = "m/44'/501'/0'/0'";
        const mnemonic = this.getSecretPhrase();

        const seed = bip39.mnemonicToSeedSync(mnemonic); // Buffer
        // also tried to slice seed.slice(0, 32);
        const derivedSeed = bip32.fromSeed(seed).derivePath(derivePath).privateKey;
        const keypair = Keypair.fromSeed(derivedSeed);

        this.solanaKeyPair = keypair;
        this.solanaAddress = this.solanaPublicKey = keypair.publicKey.toString();
    }

    get web3() {
        return this.ctx.network.web3;
    }

    // get transactionEvents() {
    //     return this.transactionEventEmitter;
    // }

    saveDefaultWalletToKeystore() {
        // use the hard coded wallet id, passcode, address and private key to save to the nodes keystore
        let id = this.config.id;
        let passcode = this.config.passcode;
        let wallet = this.ctx.network.web3.eth.accounts.wallet[0];
        let keystore = wallet.encrypt(passcode);
        fs.writeFileSync(`${this.keystore_path}/${id}`, JSON.stringify(keystore));
    }

    async sendTransaction(from, to, value) {
        let receipt = await this.web3.eth.sendTransaction({
            from: from,
            to: to,
            value: value,
            gas: 21000
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
        let account = this.web3.eth.accounts.create(this.web3.utils.randomHex(32));
        let wallet = this.web3.eth.accounts.wallet.add(account);
        let keystore = this.saveWalletToKeystore(wallet, passcode);

        // TODO: remove
        this._fundWallet(account.address);

        return keystore.id;
    }

    saveWalletToKeystore(wallet, passcode) {
        let keystore = wallet.encrypt(passcode);
        fs.writeFileSync(`${this.keystore_path}/${keystore.id}`, JSON.stringify(keystore));

        return keystore;
    }

    loadWalletFromKeystore(walletId, passcode) {
        // todo what if it does not exist?
        if (fs.existsSync(`${this.keystore_path}/${walletId}`)) {
            let keystoreBuffer = fs.readFileSync(`${this.keystore_path}/${walletId}`);
            let keystore = JSON.parse(keystoreBuffer);

            // decrypt it using the passcode
            let decryptedWallets = this.web3.eth.accounts.wallet.decrypt([keystore], passcode);

            let address = ethereumjs.addHexPrefix(keystore.address);
            return decryptedWallets[address]; // return the wallet using the address in the loaded keystore
        } else {
            return null;
        }
    }

    async getNetworkAccountBalanceInWei() {
        return await this.web3.eth.getBalance(this.network_account);
    }
    async getNetworkAccountBalanceInEth() {
        return (await this.getNetworkAccountBalanceInWei()) / 1e18;
    }

    async getHistoryForCurrency(code) {
        switch (code) {
            case 'NEON':
                return getTransactionsByAccount(
                    this.web3.eth,
                    this.getNetworkAccount(),
                    null,
                    null,
                    this.log
                );
            default:
                throw Error('Unsupported currency: ' + code);
        }
    }

    getNetworkAccount() {
        return this.network_account;
    }
    getArweaveAccount() {
        this.log.debug(this.ctx, 'getArweaveAccount context');
        return 0;
    }
    getArweaveBalanceInAR() {
        return 0;
    }

    getNetworkAccountPrivateKey() {
        // todo: Use keystore instead of config!!!
        return this.config.privateKey;
    }
    getSecretPhrase() {
        return this.config.secretPhrase;
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
            1 * solana.LAMPORTS_PER_SOL
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
                this.log.debug(
                    {
                        from: this.getNetworkAccount(),
                        to: recipient,
                        value: amount * 1e18,
                        gas: 21000
                    },
                    'Sending Neon tx'
                );
                await this.ctx.web3.eth.sendTransaction({
                    from: this.getNetworkAccount(),
                    to: recipient,
                    value: amount * 1e18,
                    gas: 21000
                });
                break;
            default:
                throw Error('This currency is not supported yet');
        }
    }

    // todo: remove
    _fundWallet(_address) {
        this.web3.eth.sendTransaction({
            from: this.network_account,
            to: _address,
            value: 1e18,
            gas: 21000
        });
    }
}

module.exports = Wallet;

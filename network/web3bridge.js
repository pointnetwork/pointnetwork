const path = require('path');
const Web3 = require('web3');
const fs = require('fs');
const ethereumUtils = require('ethereumjs-util');

const ZDNS_ROUTES_KEY = 'zdns/routes';

class Web3Bridge {
    constructor(ctx) {
        this.ctx = ctx;
        this.connectionString = this.ctx.config.network.web3;
        this.network_id = this.ctx.config.network.web3_network_id;
        this.chain_id = this.ctx.config.network.web3_chain_id;

        this.web3 = this.ctx.web3 = this.ctx.network.web3 = new Web3(this.connectionString); // todo: maybe you should hide it behind this abstraction, no?
        this.ctx.web3bridge = this;

        this.address = this.ctx.config.client.wallet.account;
        const account = this.web3.eth.accounts.privateKeyToAccount('0x' + this.ctx.config.client.wallet.privateKey);
        this.web3.eth.accounts.wallet.add(account);
        this.web3.eth.defaultAccount = account.address;
    }

    async start() {
        const { account, privateKey } = this.ctx.wallet.config;
        const publicKeyBuffer = ethereumUtils.privateToPublic(ethereumUtils.addHexPrefix(privateKey))
        const publicKey = ethereumUtils.bufferToHex(publicKeyBuffer)
        const identity = await this.identityByOwner(account);
        await this.putKeyValue(identity,'public_key', publicKey)
    }

    async loadContract(contractName, at) {
        const abiFileName = path.join(this.ctx.basepath, 'truffle/build/contracts/'+contractName+'.json');
        const abiFile = JSON.parse(fs.readFileSync(abiFileName));
        const abi = abiFile.abi;
        // const bytecode = abiFile.bytecode;

        return new this.web3.eth.Contract(abi, at);
    }

    async loadStorageProviderRegistryContract() {
        const at = this.ctx.config.network.storage_provider_registry_contract_address;
        return await this.loadContract('StorageProviderRegistry', at);
    }

    async loadIdentityContract() {
        const at = this.ctx.config.network.identity_contract_address;
        return await this.loadContract('Identity', at);
    }

    async web3send(method, gasLimit, amountEth = '0') {
        let account, gasPrice
        try {
            account = this.web3.eth.defaultAccount;
            gasPrice = await this.web3.eth.getGasPrice();
            if (!gasLimit) gasLimit = await method.estimateGas({ from: account });
            return await method.send({ from: account, gasPrice, gas: gasLimit, value: this.web3.utils.toWei(amountEth, "ether") });
        } catch (e) {
            console.info({ method, account, gasPrice, gasLimit, amountEth })
            console.error('web3send error:', e)
            throw e
        }
        /*
        .on('transactionHash', function(hash){
            ...
        })
        .on('confirmation', function(confirmationNumber, receipt){
            ...
        })
        .on('receipt', function(receipt){
        https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#id37
         */
    }

    async callContract(target, contractName, method, params) { // todo: multiple arguments, but check existing usage
        const at = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/address/'+contractName);
        const abi_storage_id = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/abi/'+contractName);
        const abi = await this.ctx.client.storage.readJSON(abi_storage_id); // todo: verify result, security, what if fails
        const contract = new this.web3.eth.Contract(abi.abi, at);
        let result = await contract.methods[ method ]( ...params ).call();
        return result;
    }

    async getPastEvents(target, contractName, event, fromBlock = 0, toBlock = 'latest') { // todo: multiple arguments, but check existing usage
        const at = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/address/'+contractName);
        const abi_storage_id = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/abi/'+contractName);
        const abi = await this.ctx.client.storage.readJSON(abi_storage_id); // todo: verify result, security, what if fails
        const contract = new this.web3.eth.Contract(abi.abi, at);
        return await contract.getPastEvents( event,  {fromBlock, toBlock } );
    }

    async sendContract(target, contractName, methodName, params) { // todo: multiple arguments, but check existing usage
        const at = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/address/'+contractName);
        const abi_storage_id = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/abi/'+contractName);
        try {
            const abi = await this.ctx.client.storage.readJSON(abi_storage_id); // todo: verify result, security, what if fails
        } catch(e) {
            throw Error('Could not read abi of the contract '+this.ctx.utils.htmlspecialchars(contractName)+'. Reason: '+e+'. If you are the website developer, are you sure you have specified in point.deploy.json config that you want this contract to be deployed?');
        }
        const contract = new this.web3.eth.Contract(abi.abi, at);
        const method = contract.methods[ methodName ](...params);
        console.log(await this.web3send(method, 2000000)); // todo: remove console.log // todo: magic number
    }

    async identityByOwner(owner) {
        const identityContract = await this.loadIdentityContract();
        const method = identityContract.methods.getIdentityByOwner(owner);
        return await method.call();
    }

    async emailIdentityByOwner(owner) {
        const identityContract = await this.loadIdentityContract();
        const method = identityContract.methods.getEmailIdentityByOwner(owner);
        return await method.call();
    }

    async getZRecord(domain) {
        domain = domain.replace('.z', ''); // todo: rtrim instead
        let result = await this.getKeyValue(domain, ZDNS_ROUTES_KEY);
        if (result.substr(0, 2) === '0x') result = result.substr(2);
        return result;
    }
    async putZRecord(domain, routesFile) {
        domain = domain.replace('.z', ''); // todo: rtrim instead
        return await this.putKeyValue(domain, ZDNS_ROUTES_KEY, routesFile)
    }

    async getKeyValue(identity, key) {
        identity = identity.replace('.z', ''); // todo: rtrim instead
        const contract = await this.loadIdentityContract();
        let result = await contract.methods.ikvGet(identity, key).call();
        return result;
    }
    async putKeyValue(identity, key, value) {
        // todo: only send transaction if it's different. if it's already the same value, no need
        identity = identity.replace('.z', ''); // todo: rtrim instead
        const contract = await this.loadIdentityContract();
        const method = contract.methods.ikvPut(identity, key, value);
        console.log(await this.web3send(method, 2000000)); // todo: remove console.log // todo: magic number
    }
    async toChecksumAddress(address) {
        const checksumAddress = await this.web3.utils.toChecksumAddress(address)
        return checksumAddress
    }
    async announceStorageProvider(connection, collateral_lock_period, cost_per_kb) {
        let contract, method, account, gasPrice
        try {
            contract = await this.loadStorageProviderRegistryContract();
            method = contract.methods.announce(connection, collateral_lock_period, cost_per_kb);
            account = this.ctx.config.hardcode_default_provider;
            gasPrice = await this.web3.eth.getGasPrice();
            return await method.send({ from: account, gasPrice, gas: 2000000, value: 100});
        } catch (e) {
            console.info({ method, gasPrice, account, collateral_lock_period, cost_per_kb })
            console.error('announceStorageProvider error:', e)
            throw e
        }
    }
    async getCheapestStorageProvider() {
        const contract = await this.loadStorageProviderRegistryContract();
        return contract.methods.readCheapestProvider().call();
    }
    async getAllStorageProvider() {
        const contract = await this.loadStorageProviderRegistryContract();
        return contract.methods.readAllProviders().call(); // todo: cache response and return cache if exists
    }
    async getSingleProvider(address) {
        const contract = await this.loadStorageProviderRegistryContract();
        return contract.methods.getProvider(address).call();
    }
}

module.exports = Web3Bridge;
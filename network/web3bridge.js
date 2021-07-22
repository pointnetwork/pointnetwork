const path = require('path');
const Web3 = require('web3');
const fs = require('fs');
const ethereumUtils = require('ethereumjs-util');
const _ = require('lodash');

const ZDNS_ROUTES_KEY = 'zdns/routes';

class Web3Bridge {
    constructor(ctx) {
        this.ctx = ctx;
        this.connectionString = this.ctx.config.network.web3;
        this.network_id = this.ctx.config.network.web3_network_id;
        this.chain_id = this.ctx.config.network.web3_chain_id;

        // use WebsocketProvider to support subscriptions
        const localProvider = new Web3.providers.WebsocketProvider(this.connectionString)
        this.web3 = this.ctx.web3 = this.ctx.network.web3 = new Web3(localProvider); // todo: maybe you should hide it behind this abstraction, no?
        this.ctx.web3bridge = this;

        this.address = this.ctx.config.client.wallet.account;
        const account = this.web3.eth.accounts.privateKeyToAccount('0x' + this.ctx.config.client.wallet.privateKey);
        this.web3.eth.accounts.wallet.add(account);
        this.web3.eth.defaultAccount = account.address;
    }

    async start() {
    }

    async loadPointContract(contractName, at) {
        const abiFileName = path.join(this.ctx.basepath, 'truffle/build/contracts/'+contractName+'.json');
        const abiFile = JSON.parse(fs.readFileSync(abiFileName));
        const abi = abiFile.abi;
        // const bytecode = abiFile.bytecode;

        return new this.web3.eth.Contract(abi, at);
    }

    async loadStorageProviderRegistryContract() {
        const at = this.ctx.config.network.storage_provider_registry_contract_address;
        return await this.loadPointContract('StorageProviderRegistry', at);
    }

    async loadIdentityContract() {
        const at = this.ctx.config.network.identity_contract_address;
        return await this.loadPointContract('Identity', at);
    }

    async loadWebsiteContract(target, contractName) {
        // todo: make it nicer, extend to all potential contracts, and add to docs
        // @ means internal contract for Point Network (truffle/contracts)
        if (target === '@' && contractName === 'Identity') {
            return this.loadIdentityContract();
        }

        const at = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/address/'+contractName);
        const abi_storage_id = await this.ctx.web3bridge.getKeyValue(target, 'zweb/contracts/abi/'+contractName);
        let abi;
        try {
            abi = await this.ctx.client.storage.readJSON(abi_storage_id); // todo: verify result, security, what if fails
            // todo: cache the result, because contract's abi at this specific address won't change (i think? check.)

            return new this.web3.eth.Contract(abi.abi, at);
        } catch(e) {
            throw Error('Could not read abi of the contract '+this.ctx.utils.htmlspecialchars(contractName)+'. Reason: '+e+'. If you are the website developer, are you sure you have specified in point.deploy.json config that you want this contract to be deployed?');
        }
    }

    async web3send(method, optons={}) {
        let account, gasPrice;
        let { gasLimit, amountInWei } = optons;
        try {
            account = this.web3.eth.defaultAccount;
            gasPrice = await this.web3.eth.getGasPrice();
            if (!gasLimit) gasLimit = await method.estimateGas({ from: account, value: amountInWei });
            return await method.send({ from: account, gasPrice, gas: gasLimit, value: amountInWei });
        } catch (e) {
            console.info({ method, account, gasPrice, gasLimit, amountInWei })
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

    async callContract(target, contractName, method, params) { // todo: multiple arguments, but check existing usage // huh?
        const contract = await this.loadWebsiteContract(target, contractName);
        if (! Array.isArray(params)) throw Error('Params sent to callContract is not an array');
        if (! contract.methods[ method ]) throw Error('Method '+method+' does not exist on contract '+contractName); // todo: sanitize
        let result = await contract.methods[ method ]( ...params ).call();
        return result;
    }

    async getPastEvents(target, contractName, event, options={fromBlock: 0, toBlock: 'latest'}) {
        const contract = await this.loadWebsiteContract(target, contractName);
        return await contract.getPastEvents( event,  options );
    }

    async subscribeEvent(target, contractName, event, callback, options={}) {
        const contract = await this.loadWebsiteContract(target, contractName);
        const subscription = contract.events[event](options)
            .on('data', event => callback(event))
            .on('connected', subscriptionId => console.log(subscriptionId));
        return subscription;
    }

    async sendToContract(target, contractName, methodName, params, options={}) { // todo: multiple arguments, but check existing usage // huh?
        const contract = await this.loadWebsiteContract(target, contractName);

        if (! Array.isArray(params)) throw Error('Params sent to callContract is not an array');

        // storage id: convert string -> bytes32
        for(let k in contract.methods) {
            if (k.split('(')[0] === methodName && k.includes('(')) { // example of k: send(address,bytes32,string)
                let paramIdx = 0;
                let kArgTypes = k.split('(')[1].replace(')','').split(',');
                for(let kArgType of kArgTypes) {
                    if (kArgType === 'bytes32') {
                        // Potential candidate for conversion
                        let param_value = params[paramIdx];
                        if (typeof param_value === "string" && param_value.replace('0x','').length === 32*2) { // 256 bit
                            // Turns out, you only need to add 0x
                            if (!_.startsWith(param_value, '0x')) params[paramIdx] = '0x'+param_value;
                        }
                    }
                    paramIdx++;
                }
            }
        }

        // Now call the method
        const method = contract.methods[ methodName ](...params);
        console.log(await this.web3send(method, options)); // todo: remove console.log
    }

    async identityByOwner(owner) {
        const identityContract = await this.loadIdentityContract();
        const method = identityContract.methods.getIdentityByOwner(owner);
        return await method.call();
    }

    async ownerByIdentity(identity) {
        const identityContract = await this.loadIdentityContract();
        const method = identityContract.methods.getOwnerByIdentity(identity);
        return await method.call();
    }

    async commPublicKeyByIdentity(identity) {
        const identityContract = await this.loadIdentityContract();
        const method = identityContract.methods.getCommPublicKeyByIdentity(identity);
        const parts = await method.call();
        return '0x' + parts.part1.replace('0x', '') + parts.part2.replace('0x', '');
        // todo: make damn sure it didn't return something silly like 0x0 or 0x by mistake
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
        if (typeof identity !== 'string') throw Error('web3bridge.getKeyValue(): identity must be a string');
        if (typeof key !== 'string') throw Error('web3bridge.getKeyValue(): key must be a string');
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
        console.log(await this.web3send(method)); // todo: remove console.log
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
        return contract.methods.getCheapestProvider().call();
    }
    async getAllStorageProvider() {
        const contract = await this.loadStorageProviderRegistryContract();
        return contract.methods.getAllProviderIds().call(); // todo: cache response and return cache if exists
    }
    async getSingleProvider(address) {
        const contract = await this.loadStorageProviderRegistryContract();
        return contract.methods.getProvider(address).call();
    }
}

module.exports = Web3Bridge;
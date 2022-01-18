const ProviderChunk = require('../db/models/provider_chunk');
const ethUtil = require('ethereumjs-util');
const utils = require('#utils');
const path = require('path');
const { fork } = require('child_process');

class Provider {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.service_provider;
        this.node = this.ctx.network.kademlia.node;

        // todo: limit decryptors amount, queue them (10 instead of 100 parallel)
        this.chunk_decryptors = {};
    }

    async start() {
        // If storage provider functionality is not enabled, why are we even here?
        if (!this.ctx.config.service_provider.enabled) return;

        await this.init();

        // todo: rewrite with threads!
        this.timeout = this.ctx.config.simulation_delay;
        this.timerFn = null;
        this.timerFn = async() => {
            await this.cycle();
            setTimeout(this.timerFn, this.timeout);
        };
        this.timerFn();
    }

    async init() {
        this.privateKeyHex = this.ctx.wallet.getNetworkAccountPrivateKey();
        this.privateKey = Buffer.from(this.privateKeyHex, 'hex');
        this.publicKey = ethUtil.privateToPublic(this.privateKey); // todo: different source than networkPrivateKeyHex, cross validate them!
        const address = ethUtil.publicToAddress(this.publicKey);
        const identity = address;

        this.connectNode(this.node);

        if (this.ctx.config.service_provider.enabled) {
            this.id = this.ctx.wallet.getNetworkAccount().replace('0x','').toLowerCase();

            await this.announce();
        }
    }

    async cycle() {
        // todo
    }

    getConnectionString() {
        const hostname = this.ctx.config.network.communication_external_host;
        return `http://${hostname}:${this.ctx.config.network.communication_port}/#${this.id}`;
    }

    async announce() {
        // todo: see if already announced?

        console.log('Announcing '+this.getConnectionString()+'...');

        let collateralSizeEth = "5"; // todo: magic number
        let cost_per_kb = "1"; // todo: magic numbers

        try {
            return await this.ctx.web3bridge.announceStorageProvider(this.getConnectionString(), collateralSizeEth, cost_per_kb);
        } catch(e) {
            this.ctx.log.error(e);
            console.log('\x07'); // bell

            // try again in 20 seconds
            setTimeout(this.announce.bind(this), 20000);
        }
    }

    connectNode(node) {
        node.use('STORE_CHUNK_REQUEST', this.STORE_CHUNK_REQUEST.bind(this));
        node.use('STORE_CHUNK_SEGMENTS', this.STORE_CHUNK_SEGMENTS.bind(this));
        node.use('STORE_CHUNK_DATA', this.STORE_CHUNK_DATA.bind(this));
        node.use('STORE_CHUNK_SIGNATURE_REQUEST', this.STORE_CHUNK_SIGNATURE_REQUEST.bind(this));
        node.use('GET_CHUNK', this.GET_CHUNK.bind(this));
        node.use('GET_DECRYPTED_CHUNK', this.GET_DECRYPTED_CHUNK.bind(this));
    }

    async STORE_CHUNK_REQUEST(request, response, next) { // todo: shouldn't we use next properly instead of directly stopping here and sending response?
        const chunk_id = request.params[0]; // todo: validate
        const length = request.params[1]; // todo: validate
        const expires = request.params[2]; // todo: validate
        //await ProviderChunk.findOrCreate(chunk_id); // todo: enc or dec?
        // todo: validate/negotiate. also, write these things down, if length is invalid, you just stop there
        response.send([chunk_id]); // success
    }

    async STORE_CHUNK_SIGNATURE_REQUEST(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        const chunk = await ProviderChunk.find(chunk_id);
        if (!chunk) return next(new Error('ECHUNKNOTFOUND: Chunk not found, cannot sign'));

        // Assemble, decrypt and verify
        let real_id = chunk.real_id;
        if (! chunk.hasDecryptedData()) {
            try {
                chunk.getData(); // We're calling this so that if the file with the encrypted chunk itself doesn't exist, it gets reassembled from the segments
            } catch(e) {
                console.debug(e); // todo
                return next(new Error('ECHUNKGETDATAERROR: Cannot get data'));
            }
            await this.decryptChunkAsync(chunk);
        }

        let decrypted = await chunk.getDecryptedData();
        if (utils.hashFnHex(decrypted) !== real_id) {
            console.error({ decryptedToString: decrypted.toString(), chunk_id, real_id, hashFn_of_Decrypted: utils.hashFnHex(decrypted), decryptedLen: decrypted.length }); // todo: delete
            // console.log('INVALID ---------------------');
            return next(new Error('EINVALIDCHUNKREALID: chunk.real_id does not match the decrypted data'));
        } else {
            // console.log('SUCCESS DECRYPTING BACK: ', decrypted.toString(), decrypted.toString('hex'), {chunk_id, real_id, decrypted_id:utils.hashFnHex(decrypted)});
            // console.error(decrypted.toString(), decrypted.toString('hex'), chunk_id, real_id, utils.hashFnHex(decrypted)); // todo: delete
            // console.log('YEP DECRYPTED FINE ---------------------');
        }

        chunk.real_id_verified = true;
        await chunk.save();

        let signature;
        try {
            signature = utils.pointSign([ 'STORAGE', 'PLEDGE', chunk_id, 'time' ], this.privateKey, this.chainId);
        } catch(e) {
            this.ctx.log.error(e);
            return next(new Error('Error while trying to sign the pledge'));
        }

        response.send([chunk_id, utils.serializeSignature(signature)]); // success
    }

    async STORE_CHUNK_DATA(request, response, next) {
        // todo: transaction/locking

        const chunk_id = request.params[0]; // todo: validate
        
        try {
            let chunk = await ProviderChunk.findOrCreate({where: {id: chunk_id}});

            const segment_index = request.params[1]; // todo: validate
            const segment_data = request.params[2]; // todo: validate

            // todo: if the chunk is already there (and findByPk found it) don't change anything maybe?

            if(! Buffer.isBuffer(segment_data) ) {
                return next(new Error('Error while loading segment data from params: segment_data should be a buffer'));
            }

            try {
                await chunk.setSegmentData(segment_data, segment_index);
            } catch(e) {
                if (/EINVALIDHASH/.test(e)) {
                    this.ctx.log.debug(e); // todo: remove;
                    return next(new Error('Error while attempting to setSegmentData on a provider_chunk. Possible mismatch of the hash and the data.'));
                } else {
                    this.ctx.log.warn('Error while attempting to setSegmentData on a provider_chunk with id '+chunk_id+': '+e); // todo: remove explanation if not in debug mode
                    this.ctx.log.debug(e.stack);
                    return next(new Error('Error while attempting to setSegmentData on a provider_chunk.'));
                }
            }

            chunk.status = ProviderChunk.STATUS_CREATED; // todo: ? always in this status?
            await chunk.save();

            return response.send([chunk_id]); // success
        } catch(e) {
            return next(e); // todo: in cases like this, it must fail when in development mode
        }
    }

    async STORE_CHUNK_SEGMENTS(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate

        // todo: make sure you agreed to storing it + conditions

        try {
            let chunk = await ProviderChunk.findOrCreate({where: {id: chunk_id}});

            if (chunk.status === ProviderChunk.STATUS_STORED) {
                // todo: check the integrity of the data before confidently saying you have the chunk
                throw new Error('ECHUNKALREADYSTORED');
            }

            const segment_hashes = request.params[1].map(x => x.toString('hex')); // todo: validate that it's array of valid buffers etc.
            const chunk_size = request.params[2]; // todo: validate
            const chunk_real_id = request.params[3]; // todo: validate
            const chunk_public_key = request.params[4]; // todo: validate
            const chunk_real_size = request.params[5]; // todo: validate

            // todo: if the chunk is already there (and findByPk found it) don't change anything maybe?

            chunk.segment_hashes = segment_hashes;
            chunk.validateSegmentHashes();

            // todo: what if you're rewriting valid information about the chunk?? validate if it's real information
            chunk.public_key = chunk_public_key;
            chunk.real_id = chunk_real_id;
            chunk.real_id_verified = false;
            chunk.size = chunk_size;
            chunk.real_size = chunk_real_size;

            chunk.status = ProviderChunk.STATUS_STORED; // todo: ? always in this status?
            await chunk.save();

            response.send([chunk_id]); // success
        } catch(e) {
            return next(e); // todo: in cases like this, it must fail when in development mode // todo: don't show too much about an error to the client in prod
        }
    }

    async GET_CHUNK(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        const chunk = await ProviderChunk.find(chunk_id);
        if (! chunk) {
            return next(new Error('ECHUNKNOTFOUND: Chunk with id '+chunk_id+' is not found'));
        }

        // Note: encrypted chunk data
        const data = await chunk.getData();
        response.send([chunk_id, data]);
    }
    async GET_DECRYPTED_CHUNK(request, response, next) {
        const chunk_real_id = request.params[0]; // todo: validate
        let chunk;
        try {
            chunk = await ProviderChunk.findOneByOrFail('real_id', chunk_real_id);
        } catch(e) {
            return next(new Error('ECHUNKNOTFOUND'));
        }

        if (! chunk.hasDecryptedData()) {
            chunk.getData(); // We're calling this so that if the chunk file doesn't exist, it gets reassembled from the segments
            await this.decryptChunkAsync(chunk);
        }

        let decrypted = await chunk.getDecryptedData();

        if (this.config.revalidate_decrypted_chunk) {
            if (utils.hashFnHex(decrypted) !== chunk_real_id) {
                console.error(decrypted.toString(), decrypted.toString('hex'), chunk_real_id, utils.hashFnHex(decrypted)); // todo: remove
                return next(new Error('ECHUNKLOST: Sorry, can\'t decrypt it for some reason...')); // todo: uhm, maybe don't do that?
            }
        }

        response.send([chunk_real_id, decrypted]); // todo: I hope this buf is not being sent as an array through json/bson
    }

    async decryptChunkAsync(chunk) {
        return await new Promise((resolve, reject) => {
            try {
                let decryptorID = chunk.id + Math.random(); // todo: can there be a situation where, while the chunk is being decrypted, another request comes in for the same chunk and it gets decrypted in parallel again? catch this

                let chunk_decryptor = fork(path.join(this.ctx.basepath, 'threads/decrypt.js'));

                this.chunk_decryptors[ decryptorID ] = chunk_decryptor;

                chunk_decryptor.on('message', async(message) => {
                    if (message.command === 'decrypt' && message.success === true) {
                        chunk_decryptor.kill('SIGINT');
                        delete this.chunk_decryptors[ decryptorID ];

                        resolve();
                    } else {
                        // todo: don't die here
                        console.warn('Something is wrong, decryptor for chunk '+chunk.id+' returned ', message);
                        this.ctx.die();
                    }
                });
                // todo: do we need this?
                chunk_decryptor.addListener("output", function (data) {
                    console.log('Chunk Decryptor output: '+data);
                });
                // todo: two error listeners?
                chunk_decryptor.addListener("error", async (data) => { // todo
                    // await link.refresh();
                    // link.status = StorageLink.STATUS_FAILED;
                    // link.error = data;
                    // link.errored = true;
                    // console.error('Chunk decryption FAILED:' + link.error);
                    // await link.save();
                    // todo: don't die here, reject promise
                    console.warn('Something is wrong, decryptor for chunk '+chunk.id+' returned ', data);
                    this.ctx.die();
                });
                chunk_decryptor.on("error", async (data) => { // todo
                    // todo: don't die here, reject promise
                    console.warn('Something is wrong, decryptor for chunk '+chunk.id+' returned ', data);
                    this.ctx.die();
                    // await link.refresh();
                    // link.status = StorageLink.STATUS_FAILED;
                    // link.error = data;
                    // link.errored = true;
                    // console.error('Chunk encryption FAILED:' + link.error);
                    // await link.save();
                });
                chunk_decryptor.on("exit", async (code) => {
                    if (code === 0 || code === null) {
                        // do nothing
                    }
                    else {
                        // todo: don't die here, reject promise
                        console.warn('Something is wrong, decryptor for chunk '+chunk.id+' returned code', code);
                        this.ctx.die();
                        // // todo: figure out which one is failed
                        // link.status = StorageLink.STATUS_FAILED;
                        // console.error('Chunk encryption FAILED, exit code', code);
                        // //link.error = data;
                        // await link.save();
                    }
                });

                chunk_decryptor.send({ command: 'decrypt', fileIn: ProviderChunk.getChunkStoragePath(chunk.id), fileOut:  ProviderChunk.getDecryptedChunkStoragePath(chunk.id), pubKey: chunk.public_key, chunkId: chunk.id });
            } catch(e) {
                reject(e);
            }
        });
    }
}

module.exports = Provider;

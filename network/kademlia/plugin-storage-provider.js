const ProviderChunk = require('../../db/models/provider_chunk');
const ethUtil = require('ethereumjs-util');
const utils = require('@kadenceproject/kadence/lib/utils');

class StorageProviderPlugin {
    /**
     * Creates the plugin instance
     */
    constructor(node, ctx, publicKey, privateKey, options = {}) {
        this.ctx = ctx;
        this.node = node;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.chainId = this.ctx.config.network.web3_chain_id;

        node.use('STORE_CHUNK_REQUEST', this.STORE_CHUNK_REQUEST.bind(this));
        node.use('STORE_CHUNK_SEGMENTS', this.STORE_CHUNK_SEGMENTS.bind(this));
        node.use('STORE_CHUNK_DATA', this.STORE_CHUNK_DATA.bind(this));
        node.use('STORE_CHUNK_SIGNATURE_REQUEST', this.STORE_CHUNK_SIGNATURE_REQUEST.bind(this));
        node.use('GET_CHUNK', this.GET_CHUNK.bind(this));
        node.use('GET_DECRYPTED_CHUNK', this.GET_DECRYPTED_CHUNK.bind(this));
    }

    async STORE_CHUNK_REQUEST(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        //await ProviderChunk.findOrCreate(chunk_id); // todo: enc or dec?
        response.send([chunk_id]); // success
    }

    async STORE_CHUNK_SIGNATURE_REQUEST(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        const chunk = await ProviderChunk.find(chunk_id);
        if (!chunk) return next(new Error('ECHUNKNOTFOUND: Chunk not found, cannot sign'));

        let signature;
        try {
            // todo: delete the next block, it's just for debugging
            chunk.getData();

            signature = this.ctx.utils.pointSign([ 'STORAGE', 'PLEDGE', chunk_id, 'time' ], this.privateKey, this.chainId);
        } catch(e) {
            return next(new Error('Error while trying to sign the pledge'));
        }

        response.send([chunk_id, this.ctx.utils.serializeSignature(signature)]); // success
    }

    async STORE_CHUNK_DATA(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        const chunk = await ProviderChunk.findOrCreate(chunk_id);

        // todo: make sure you agreed to storing it + conditions

        const segment_index = request.params[1]; // todo: validate
        const segment_data = request.params[2]; // todo: validate // todo: validate that it's buffer

        try {
            await chunk.setSegmentData(segment_data, segment_index);
        } catch(e) {
            if (/EINVALIDHASH/.test(e)) {
                this.ctx.log.debug(e); // todo: remove;
                return next(new Error('Error while attempting to setData on a chunk. Possible mismatch of the hash and the data.'));
            } else {
                this.ctx.log.warn('Error while attempting to setData on provider_chunk with id '+chunk_id+': '+e); // todo: remove e-xplanation if not in debug mode
                this.ctx.log.debug(e.stack);
                return next(new Error('Error while attempting to setData on a chunk.'));
            }
        }

        chunk.status = ProviderChunk.STATUS_CREATED; // todo: ? always in this status?
        await chunk.save();

        response.send([chunk_id]); // success
    }

    async STORE_CHUNK_SEGMENTS(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        let chunk = await ProviderChunk.findOrCreate(chunk_id);

        // todo: make sure you agreed to storing it + conditions

        if (chunk.status === ProviderChunk.STATUS_STORED) {
            // todo: check the integrity of the data before confidently saying you have the chunk
            return next(new Error('ECHUNKALREADYSTORED'))
        }

        const segment_hashes = request.params[1].map(x => x.toString('hex')); // todo: validate that it's array of valid buffers etc.
        const chunk_length = request.params[2]; // todo: validate
        const chunk_real_id = request.params[3]; // todo: validate
        const chunk_pub_key = request.params[4]; // todo: validate
        const chunk_real_length = request.params[5]; // todo: validate

        chunk.segment_hashes = segment_hashes;
        chunk.validateSegmentHashes();

        chunk.pub_key = chunk_pub_key;
        chunk.real_id = chunk_real_id;
        chunk.real_id_verified = false;
        chunk.length = chunk_length;
        chunk.real_length = chunk_real_length;

        chunk.status = ProviderChunk.STATUS_STORED; // todo: ? always in this status?
        await chunk.save();

        response.send([chunk_id]); // success
    }

    async GET_CHUNK(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        const chunk = await ProviderChunk.find(chunk_id);
        if (! chunk) {
            return next(new Error('ECHUNKNOTFOUND: Chunk with this id is not found'));
        }

        // const data = chunk.getData();
        const decrypted = await chunk.getData();
        response.send([chunk_id, decrypted]);
    }
    async GET_DECRYPTED_CHUNK(request, response, next) {
        const chunk_id = request.params[0]; // todo: validate
        const chunk = await ProviderChunk.findBy('real_id', chunk_id);
        if (!chunk) return next(new Error('ECHUNKNOTFOUND: Decrypted chunk with this id is not found'));

        let decrypted = await chunk.getDecryptedData();
        response.send([chunk_id, decrypted]);
    }
}

/**
 * Registers the plugin with a node
 */
module.exports = function(ctx, publicKey, privateKey, options) {
    return function(node) {
        return new StorageProviderPlugin(node, ctx, publicKey, privateKey, options);
    };
};

module.exports.StorageProviderPlugin = StorageProviderPlugin;
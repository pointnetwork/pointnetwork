const ethUtil = require('ethereumjs-util');
const kadUtils = require('@pointnetwork/kadence/lib/utils');
const StorageProviderPlugin = require('./plugin-storage-provider');
const Chunk = require('../../db/models/chunk');
const StorageLink = require('../../db/models/storage_link');
const DB = require('../../db');

class StorageClientPlugin {
    /**
     * Creates the plugin instance
     */
    constructor(node, ctx, options = {}) {
        this.ctx = ctx;
        this.node = node;
        this.chainId = this.ctx.config.network.web3_chain_id;
    }
}

/**
 * Registers the plugin with a node
 */
module.exports = function(ctx, options) {
    return function(node) {
        return new StorageClientPlugin(node, ctx, options);
    };
};

module.exports.StorageClientPlugin = StorageClientPlugin;
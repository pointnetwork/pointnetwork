class StorageProviderPlugin {
    /**
     * Creates the plugin instance
     */
    constructor(node, ctx, publicKey, privateKey, options = {}) {
        this.ctx = ctx;
        this.config = this.ctx.config.service_provider.storage
        this.node = node;
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.chainId = this.ctx.config.network.web3_chain_id;

        // If storage provider functionality is not enabled, why are we even here?
        if (!this.ctx.config.service_provider.enabled) return;
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
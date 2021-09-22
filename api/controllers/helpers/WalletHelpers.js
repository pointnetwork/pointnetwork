/* Wallet Helper Functions */

function useWalletTokenFromConfig() {
    return `${ctx.config.client.wallet.id}-${ctx.config.client.wallet.passcode}`;
}

function initWallet(ctx, walletToken) {
    // For prototype / demo version use the wallet token from the config
    // TODO remove and replace with real auth / security
    walletToken = useWalletTokenFromConfig();
    this.validateWalletToken(walletToken);
    const {walletId, passcode} = this.parseWalletToken(walletToken);
    return this.loadWallet(ctx, walletId, passcode);
}

function validateWalletToken(token) {
    if (token === undefined) {
        throw new Error('Missing wallet-token header.');
    }
    if (token.length < 69) {
        throw new Error('wallet-token invalid.');
    }
}

function parseWalletToken(token) {
    const walletId = token.slice(0, 36);
    const passcode = token.slice(37, 103);
    return {walletId, passcode};
}

function loadWallet(ctx, walletId, passcode) {
    // load the wallet from the keystore file
    const wallet = ctx.wallet.loadWalletFromKeystore(walletId, passcode);
    return wallet;
}

const walletHelpers = {
    initWallet,
    validateWalletToken,
    parseWalletToken,
    loadWallet
};

module.exports = walletHelpers;
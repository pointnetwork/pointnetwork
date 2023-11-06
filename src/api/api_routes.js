module.exports = [
    [
        'GET',
        '/v1/api/identity/identityToOwner/:identity',
        'IdentityController@identityToOwner',
        {protected: true}
    ],
    [
        'GET',
        '/v1/api/identity/publicKeyByIdentity/:identity',
        'IdentityController@publicKeyByIdentity',
        {protected: true}
    ],
    [
        'GET',
        '/v1/api/identity/ownerToIdentity/:owner',
        'IdentityController@ownerToIdentity',
        {protected: true}
    ],
    [
        'GET',
        '/v1/api/identity/isIdentityEligible/:identity',
        'IdentityController@isIdentityEligible',
        {protected: true}
    ],
    [
        'GET',
        '/v1/api/identity/isIdentityRegistered/',
        'IdentityController@isIdentityRegistered',
        {protected: true}
    ],
    [
        'GET',
        '/v1/api/identity/identityRegistered',
        'IdentityController@identityRegistered',
        {protected: true}
    ],
    ['POST', '/v1/api/identity/blockTimestamp', 'IdentityController@blockTimestamp'], // TODO: why POST?
    ['POST', '/v1/api/identity/open', 'IdentityController@openLink', {protected: true}],
    [
        'POST',
        '/v1/api/identity/register',
        'IdentityController@registerIdentity',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'POST',
        '/v1/api/identity/sub/register',
        'IdentityController@registerSubIdentity',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/identity/resolve/:domain',
        'IdentityController@resolveDomain',
        {protected: false}
    ],
    [
        'POST',
        '/v1/api/identity/ikvPut',
        'IdentityController@ikvPut',
        {protected: true, gatewayDisabled: true}
    ],
    ['GET', '/v1/api/status/ping', 'PingController@ping'],
    ['GET', '/v1/api/status/meta', 'StatusController@meta'],
    ['POST', '/v1/api/deploy', 'DeployController@deploy', {gatewayDisabled: true}], // TODO: not protecting for now, but should
    [
        'GET',
        '/v1/api/migrate',
        'MigrateController@migrate',
        {protected: true, gatewayDisabled: true}
    ],
    ['GET', '/v1/api/deploy/progress', 'DeployController@deployProgress', {gatewayDisabled: true}], // TODO: not protecting for now, but should
    ['GET', '/v1/api/storage/files/:id', 'StorageController@fileById', {protected: true}],
    ['POST', '/v1/api/storage/pubsub/publish/:topic', 'StorageController@pubsubPublish', {protected: true}],
    ['POST', '/v1/api/storage/pubsub/publishForIdentity', 'StorageController@pubsubPublishForIdentity', {protected: true}],
    ['POST', '/v1/api/storage/pubsub/subscribe/:topic', 'StorageController@pubsubSubscribe', {protected: true}],
    ['POST', '/v1/api/storage/pubsub/unsubscribe/:topic', 'StorageController@pubsubUnsubscribe', {protected: true}],
    ['GET', '/v1/api/storage/getString/:id', 'StorageController@getString', {protected: true}],
    [
        'POST',
        '/v1/api/storage/putString',
        'StorageController@putString',
        {protected: true, gatewayDisabled: true}
    ],

    ['GET', '/v1/api/storage/host/get', 'StorageController@hostStorageGet', {protected: true}],
    ['GET', '/v1/api/storage/host/len', 'StorageController@hostStorageLen', {protected: true}],
    ['GET', '/v1/api/storage/host/dir', 'StorageController@hostStorageDir', {protected: true}],
    ['POST', '/v1/api/storage/host/set', 'StorageController@hostStorageSet', {protected: true}],
    ['POST', '/v1/api/storage/host/unset', 'StorageController@hostStorageUnset', {protected: true}],
    ['POST', '/v1/api/storage/host/append', 'StorageController@hostStorageAppend', {protected: true}],
    ['POST', '/v1/api/storage/host/removeAt', 'StorageController@hostStorageRemoveAt', {protected: true}],
    ['POST', '/v1/api/storage/host/replaceAt', 'StorageController@hostStorageReplaceAt', {protected: true}],
    ['POST', '/v1/api/storage/host/insertAt', 'StorageController@hostStorageInsertAt', {protected: true}],

    // TODO: was not working, restore if needed
    // ['GET', '/v1/api/wallet/generate', 'WalletController@generate'],
    [
        'GET',
        '/v1/api/wallet/publicKey',
        'WalletController@publicKey',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/wallet/balance',
        'WalletController@balance',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/wallet/tokenBalance',
        'WalletController@tokenBalance',
        {protected: true, gatewayDisabled: true}
    ],
    ['GET', '/v1/api/wallet/address', 'WalletController@address', {protected: true}],
    [
        'GET',
        '/v1/api/wallet/getNetworks',
        'WalletController@getNetworks',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/wallet/getAddresses',
        'WalletController@getAddresses',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/wallet/getBalances',
        'WalletController@getBalances',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/wallet/getTokenBalances',
        'WalletController@getTokenBalances',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'GET',
        '/v1/api/wallet/getIdentityNames',
        'WalletController@getIdentityNames',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'POST',
        '/v1/api/wallet/encryptData',
        'WalletController@encryptData',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'POST',
        '/v1/api/wallet/decryptData',
        'WalletController@decryptData',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'POST',
        '/v1/api/wallet/decryptSymmetricKey',
        'WalletController@decryptSymmetricKey',
        {protected: true, gatewayDisabled: true}
    ],
    [
        'POST',
        '/v1/api/wallet/decryptDataWithDecryptedKey',
        'WalletController@decryptDataWithDecryptedKey',
        {protected: true, gatewayDisabled: true}
    ],
    ['POST', '/v1/api/contract/safe_call', 'ContractController@safeCall'],
    ['GET', '/v1/api/contract/load/:contract', 'ContractController@load', {protected: true}],
    ['POST', '/v1/api/contract/events', 'ContractController@events', {protected: true}],
    ['POST', '/v1/api/web2/open', 'Web2Controller@open'],
    [
        'POST',
        '/v1/api/blockchain',
        'BlockchainController@request',
        {protected: true, gatewayDisabled: true}
    ],
    ['GET', '/v1/api/blockchain/networks', 'BlockchainController@networks', {protected: true}],
    ['POST', '/v1/api/contract/encodeFunctionCall', 'ContractController@encodeFunctionCall'],
    ['POST', '/v1/api/contract/decodeParameters', 'ContractController@decodeParameters'],
    ['GET', '/v1/api/contract/listEvents/:identity', 'ContractController@listEvents']
];

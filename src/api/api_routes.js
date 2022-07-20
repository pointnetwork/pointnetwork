module.exports = [
    ['GET', '/v1/api/identity/identityToOwner/:identity', 'IdentityController@identityToOwner'],
    [
        'GET',
        '/v1/api/identity/publicKeyByIdentity/:identity',
        'IdentityController@publicKeyByIdentity'
    ],
    ['GET', '/v1/api/identity/ownerToIdentity/:owner', 'IdentityController@ownerToIdentity'],
    [
        'GET',
        '/v1/api/identity/isIdentityEligible/:identity',
        'IdentityController@isIdentityEligible'
    ],
    ['GET', '/v1/api/identity/isIdentityRegistered/', 'IdentityController@isIdentityRegistered'],
    ['POST', '/v1/api/identity/blockTimestamp', 'IdentityController@blockTimestamp'],
    ['POST', '/v1/api/identity/open', 'IdentityController@openLink'],
    ['POST', '/v1/api/identity/register', 'IdentityController@registerIdentity'],
    ['GET', '/v1/api/identity/resolve/:domain', 'IdentityController@resolveDomain'],
    ['GET', '/v1/api/status/ping', 'PingController@ping'],
    ['GET', '/v1/api/status/meta', 'StatusController@meta'],
    ['GET', '/v1/api/deploy', 'DeployController@deploy'],
    ['GET', '/v1/api/migrate', 'MigrateController@migrate'],
    ['GET', '/v1/api/storage/files', 'StorageController@files'],
    ['GET', '/v1/api/storage/files/:id', 'StorageController@fileById'],
    ['GET', '/v1/api/storage/chunks/:id', 'StorageController@chunkById'],
    ['GET', '/v1/api/storage/getString/:id', 'StorageController@getString'],
    ['POST', '/v1/api/storage/putString', 'StorageController@putString'],
    // TODO: was not working, restore if needed
    // ['GET', '/v1/api/wallet/generate', 'WalletController@generate'],
    ['GET', '/v1/api/wallet/publicKey', 'WalletController@publicKey'],
    ['GET', '/v1/api/wallet/balance', 'WalletController@balance'],
    ['GET', '/v1/api/wallet/address', 'WalletController@address'],
    ['GET', '/v1/api/wallet/getWalletInfo', 'WalletController@getWalletInfo'],
    ['GET', '/v1/api/wallet/getTokenBalances', 'WalletController@getTokenBalances'],
    ['POST', '/v1/api/wallet/encryptData', 'WalletController@encryptData'],
    ['POST', '/v1/api/wallet/decryptData', 'WalletController@decryptData'],
    ['POST', '/v1/api/wallet/decryptSymmetricKey', 'WalletController@decryptSymmetricKey'],
    ['POST', '/v1/api/wallet/decryptDataWithDecryptedKey', 'WalletController@decryptDataWithDecryptedKey'],
    ['POST', '/v1/api/contract/call', 'ContractController@call'],
    ['POST', '/v1/api/contract/send', 'ContractController@send'],
    ['GET', '/v1/api/contract/load/:contract', 'ContractController@load'],
    ['POST', '/v1/api/contract/events', 'ContractController@events'],
    ['POST', '/v1/api/web2/open', 'Web2Controller@open'],
    ['POST', '/v1/api/blockchain', 'BlockchainController@request'],
    ['POST', '/v1/api/contract/encodeFunctionCall', 'ContractController@encodeFunctionCall'],
    ['POST', '/v1/api/contract/decodeParameters', 'ContractController@decodeParameters']
];

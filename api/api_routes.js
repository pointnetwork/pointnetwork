module.exports = [
    ['GET', '/api/ping', 'PingController@ping'],
    ['GET', '/api/status', 'StatusController@status'],
    ['GET', '/api/deploy', 'DeployController@deploy'],
    ['GET', '/api/storage/files', 'StorageController@files'],
    ['GET', '/api/storage/files/:id', 'StorageController@fileById'],
    ['GET', '/api/storage/chunks', 'StorageController@chunks'],
    ['GET', '/api/storage/chunks/:id', 'StorageController@chunkById'],
    ['GET', '/api/wallet/generate', 'WalletController@generate'],
    ['GET', '/api/wallet/publicKey', 'WalletController@publicKey'],
    ['GET', '/api/wallet/balance', 'WalletController@balance'],
    ['GET', '/api/wallet/hash', 'WalletController@hash'],
    ['GET', '/api/wallet/address', 'WalletController@address'],
    ['POST', '/api/wallet/tx', 'WalletController@tx']
];
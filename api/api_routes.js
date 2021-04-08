module.exports = [
    ['GET', '/api/ping', 'PingController@ping'],
    ['GET', '/api/status', 'StatusController@status'],
    ['GET', '/api/deploy', 'DeployController@deploy'],
    ['GET', '/api/storage/files', 'StorageController@files'],
    ['GET', '/api/storage/files/:id', 'StorageController@fileById'],
    ['GET', '/api/storage/chunks', 'StorageController@chunks'],
    ['GET', '/api/storage/chunks/:id', 'StorageController@chunkById'],
];
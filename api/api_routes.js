module.exports = [
    ['GET', '/api/ping', 'PingController@ping'],
    ['GET', '/api/deploy', 'DeployController@deploy'],
    ['GET', '/api/deploy/progress', 'DeployController@progress']
];
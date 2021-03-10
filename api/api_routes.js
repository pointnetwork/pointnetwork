module.exports = [
    ['GET', '/static/:file', 'WebController@static'],
    ['GET', '/ping', 'PingController@ping'],
    ['GET', '/deploy', 'DeployController@deploy'],
    ['GET', '/deploy/:id', 'DeployController@deployerProgress']
];
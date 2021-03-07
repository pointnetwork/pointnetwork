module.exports = [
    ['GET', '/', 'WebController@index'],
    ['GET', '/static/:file', 'WebController@static'],

    ['GET', '/ping', 'PingController@ping'],
    ['GET', '/deploy', 'DeployController@deploy'],
];
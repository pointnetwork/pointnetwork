module.exports = [
    ['GET', '/', 'WebController@index'],
    ['GET', '/static/:file', 'WebController@static'],
    ['GET', '/static/', 'WebController@index'],

    ['GET', '/ping', 'PingController@ping'],
    ['GET', '/deploy', 'DeployController@deploy'],
];
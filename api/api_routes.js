module.exports = [
    ['GET', '/ping', 'PingController@ping'],
    ['GET', '/deploy', 'DeployController@deploy'],
    ['GET', '/deploy/:id', 'DeployController@deployerProgress']
];
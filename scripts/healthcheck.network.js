const path = require('path');
const {merge} = require('lodash')
const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const ethUtil = require('ethereumjs-util');
const kadence = require('@pointnetwork/kadence');
const Messenger = require('@pointnetwork/kadence/lib/messenger');
const utils = require('../core/utils');
const AuthenticatePlugin = require('../network/kademlia/plugin-authenticate');
const SerializerBSON = require('../network/kademlia/serializer-bson');
const { id } = require('../db/models/chunk');
const datadir = process.env.DATADIR;
const config = merge(
  require(path.join(__dirname, '..', 'resources', 'defaultConfig.json')),
  require(path.join(datadir, 'config.json'))
);

const networkPrivateKeyHex = 'baecf1f685ff378c247d1b9c7095815a4604f03f1759a418e82df05b8c3be73a';
const networkPrivateKey = Buffer.from(networkPrivateKeyHex, 'hex');
const networkPublicKey = ethUtil.privateToPublic(networkPrivateKey);
const identity = ethUtil.privateToAddress(networkPrivateKey);
const tempPort = 1337;
const hostname = config.network.communication_external_host;
const protocol = parseInt(config.network.ssl_enabled) ? 'https:' : 'http:'
const contact = {hostname: 'localhost', protocol, port: tempPort, agent: kadence.version.protocol};
const messenger = new Messenger({
    serializer: SerializerBSON.serializer,
    deserializer: SerializerBSON.deserializer
});

const node = new kadence.KademliaNode({
    identity: identity,
    storage: levelup(encode(leveldown(path.join(datadir, 'healthcheck')))),
    messenger,
    logger: console,
    transport: new kadence.HTTPTransport(),
    contact
});

node.authenticate = node.plugin(AuthenticatePlugin({config, utils, log: console}, networkPublicKey, networkPrivateKey, {
    privateKey: networkPrivateKey,
    publicKey: networkPublicKey
}));

node.rolodex = node.plugin(kadence.rolodex(path.join(datadir, config.network.peer_cache_file_path)));

const targetUrl = `${protocol}//${hostname}:${config.network.communication_port}/#${
    ethUtil.privateToAddress(Buffer.from(config.client.wallet.privateKey, 'hex')).toString('hex')
}`;

const target = kadence.utils.parseContactURL(targetUrl);

console.log({
    target,
    hostname,
    protocol,
    port: config.network.communication_port,
    targetUrl
});

node.listen(tempPort, () => {
    node.join(target, (err) => {
        console.error({err})
        if (err) {
            process.exit(1);
        }
        node.send('PING', [], target, (err, response) => {
            console.log('PING:', {err, response});
            process.exit(err ? 1 : 0);
        });
    });
});

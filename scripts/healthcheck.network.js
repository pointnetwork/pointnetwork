const path = require('path');
const Web3 = require('web3');
const {merge} = require('lodash')
const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const ethUtil = require('ethereumjs-util');
const kadence = require('@pointnetwork/kadence');
const Messenger = require('@pointnetwork/kadence/lib/messenger');
const Kademlia = require('../network/kademlia');
const utils = require('../core/utils');
const AuthenticatePlugin = require('../network/kademlia/plugin-authenticate');
const SerializerBSON = require('../network/kademlia/serializer-bson');
const datadir = process.env.DATADIR;
const config = merge(
  require(path.join(__dirname, '..', 'resources', 'defaultConfig.json')),
  require(path.join(datadir, 'config.json'))
);

const networkPrivateKey = Buffer.from(new Web3().eth.accounts.create().privateKey.replace(/^0x/, ''), 'hex');
const networkPublicKey = ethUtil.privateToPublic(networkPrivateKey);
const address = ethUtil.privateToAddress(networkPrivateKey);
const identity = address;
const tempPort = 1337;
const protocol = parseInt(config.network.ssl_enabled) ? 'https:' : 'http:'
const contact = {hostname: 'localhost', protocol, port: tempPort, agent: kadence.version.protocol};
const messenger = new Messenger({
    serializer: SerializerBSON.serializer,
    deserializer: SerializerBSON.deserializer
});

Kademlia.prototype.patchKadence();

const node = new kadence.KademliaNode({
    identity,
    storage: levelup(encode(leveldown(path.join(datadir, 'healthcheck')))),
    messenger,
    logger: console,
    transport: new kadence.HTTPTransport(),
    contact
});

node.authenticate = node.plugin(AuthenticatePlugin({config, utils, log: console}, networkPublicKey, networkPrivateKey));

const targetUrl = `${protocol}//localhost:${config.network.communication_port}/#${
    ethUtil.privateToAddress(Buffer.from(config.client.wallet.privateKey, 'hex')).toString('hex')
}`;

const target = kadence.utils.parseContactURL(targetUrl);
const checkHealth = async () => {
    try {
        console.info({listen: await new Promise((resolve) => node.listen(tempPort, resolve))});
        console.info({ping: await node.ping(target)});
        console.info({close: await node.send('DISCONNECT', [], target)});
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkHealth();

const kadence = require('@pointnetwork/kadence');
const kadenceConstants = require('@pointnetwork/kadence/lib/constants');
const path = require('path');
const fs = require('fs');
const _async = require('async');
const ethUtil = require('ethereumjs-util');
const AuthenticatePlugin = require('./plugin-authenticate');
const StorageProviderPlugin = require('./plugin-storage-provider');
const StorageClientPlugin = require('./plugin-storage-client');
const kadenceUtils = require('@pointnetwork/kadence/lib/utils');
const pino = require('pino');
const SerializerBSON = require('./serializer-bson');
const Messenger = require('@pointnetwork/kadence/lib/messenger');
const { log } = require('console');

class Kademlia {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = this.ctx.config.network;
    }

    async start() {
        this.patchKadence();

        const storage = this.ctx.db._db.sublevel('kadence');

        const networkPrivateKeyHex = this.ctx.wallet.getNetworkAccountPrivateKey();
        const networkPrivateKey = Buffer.from(networkPrivateKeyHex, 'hex');
        const networkPublicKey = ethUtil.privateToPublic(networkPrivateKey); // todo: different source than networkPrivateKeyHex, cross validate them!
        const address = ethUtil.privateToAddress(networkPrivateKey);
        const identity = address;
        this.ctx.log.info('Starting kadence DHT network...');

        // Initialize public contact data
        const contact = {
            hostname: this.config.communication_external_host,
            protocol: parseInt(this.config.ssl_enabled) ? 'https:' : 'http:',
            port: parseInt(this.config.communication_port),
            agent: kadence.version.protocol // todo: versioning
        };

        const messenger = new Messenger({
            serializer: SerializerBSON.serializer,
            deserializer: SerializerBSON.deserializer
        });

        const node = this.node = new kadence.KademliaNode({
            identity,
            storage,
            messenger,
            logger: this.ctx.log,
            transport: new kadence.HTTPTransport(),
            contact
        });

        // todo:
        // also todo: http://pieroxy.net/blog/pages/lz-string/index.html
        // const { Transform } = require('stream');
        // node.rpc.serializer.append(() => new Transform({
        //     transform: function(data, encoding, callback) {
        //         console.log({data,encoding,callback});
        //         console.log(data.toString(encoding))
        //     },
        //     objectMode: true
        // }));
        //
        // node.rpc.deserializer.append(() => new Transform({
        //     transform: function(data, encoding, callback) {
        //         console.log({data,encoding,callback});
        //     },
        //     objectMode: true
        // }));

        // todo: enable all plugins?
        // node.hashcash = node.plugin(kadence.hashcash({
        //     methods: ['PUBLISH', 'SUBSCRIBE'],
        //     difficulty: 8
        // }));
        // node.quasar = node.plugin(kadence.quasar());
        node.authenticate = node.plugin(AuthenticatePlugin(this.ctx, networkPublicKey, networkPrivateKey, {
            privateKey: networkPrivateKey,
            publicKey: networkPublicKey
        }));

        // node.eclipse = node.plugin(kadence.eclipse());

        // todo: permission plugin is gone from the new repo - check if we need it at all
        // let solutionsPath = path.join(this.ctx.datadir, this.config.solutions_dir_path);
        // if (! fs.existsSync(solutionsPath)) fs.mkdirSync(solutionsPath);
        // node.permission = node.plugin(kadence.permission({
        //     privateKey: node.authenticate.privateKey,
        //     walletPath: solutionsPath
        // }));

        node.rolodex = node.plugin(kadence.rolodex(path.join(this.ctx.datadir, this.config.peer_cache_file_path)));

        node.storage_client = node.plugin(StorageClientPlugin(ctx, networkPublicKey, networkPrivateKey, {}));

        if (this.ctx.config.service_provider.enabled) {
            node.storage_provider = node.plugin(StorageProviderPlugin(ctx, networkPublicKey, networkPrivateKey, {}));
        }

        // todo: all this vvvvvvv
        // node.blacklist = node.plugin(kadence.churnfilter({
        //     cooldownBaseTimeout: this.config.churn_filter.cooldown_base_timeout,
        //     cooldownMultiplier: parseInt(this.config.churn_filter.cooldown_multiplier),
        //     cooldownResetTime: this.config.churn_filter.cooldown_reset_time
        // }));

        // this.ctx.log.info('validating solutions in wallet, this can take some time');
        // await node.wallet.validate();
        //
        // // Hibernate when bandwidth thresholds are reached
        // if (!!parseInt(config.BandwidthAccountingEnabled)) {
        //     node.hibernate = node.plugin(kadence.hibernate({
        //         limit: config.BandwidthAccountingMax,
        //         interval: config.BandwidthAccountingReset,
        //         reject: ['FIND_VALUE', 'STORE']
        //     }));
        // }
        //
        // // Use Tor for an anonymous overlay
        // if (!!parseInt(config.OnionEnabled)) {
        //     kadence.constants.T_RESPONSETIMEOUT = 20000;
        //     node.onion = node.plugin(kadence.onion({
        //         dataDirectory: config.OnionHiddenServiceDirectory,
        //         virtualPort: config.OnionVirtualPort,
        //         localMapping: `127.0.0.1:${config.NodeListenPort}`,
        //         torrcEntries: {
        //             CircuitBuildTimeout: 10,
        //             KeepalivePeriod: 60,
        //             NewCircuitPeriod: 60,
        //             NumEntryGuards: 8,
        //             Log: `${config.OnionLoggingVerbosity} stdout`
        //         },
        //         passthroughLoggingEnabled: !!parseInt(config.OnionLoggingEnabled)
        //     }));
        // }
        //
        // // Punch through NATs
        // if (!!parseInt(config.TraverseNatEnabled)) {
        //     node.traverse = node.plugin(kadence.traverse([
        //         new kadence.traverse.UPNPStrategy({
        //             mappingTtl: parseInt(config.TraversePortForwardTTL),
        //             publicPort: parseInt(node.contact.port)
        //         }),
        //         new kadence.traverse.NATPMPStrategy({
        //             mappingTtl: parseInt(config.TraversePortForwardTTL),
        //             publicPort: parseInt(node.contact.port)
        //         }),
        //         new kadence.traverse.ReverseTunnelStrategy({
        //             remoteAddress: config.TraverseReverseTunnelHostname,
        //             remotePort: parseInt(config.TraverseReverseTunnelPort),
        //             privateKey: node.spartacus.privateKey,
        //             secureLocalConnection: true,
        //             verboseLogging: parseInt(config.VerboseLoggingEnabled)
        //         })
        //     ]));
        // }

        // Handle any fatal errors
        node.on('error', (err) => {
            this.ctx.log.error(err.message);
            this.ctx.log.debug(err.stack);
            // todo: more than just log?
        });

        // Use verbose logging if enabled
        if (this.ctx.log.levelVal <= pino.levels.values.debug) {
            node.plugin(kadence.logger(this.log));
        }

        const bootstrapNodes = this.config.bootstrap_nodes;

        const joinNetwork = async(callback) => {
            let peers = bootstrapNodes.concat(
                await node.rolodex.getBootstrapCandidates()
            );

            if (peers.length === 0) {
                this.ctx.log.info('No bootstrap seeds provided and no known profiles');
                this.ctx.log.info('Running in seed mode (waiting for connections)');

                return node.router.events.once('add', (identity) => {
                    this.config.bootstrap_nodes = [ // todo: i think the intention here was to persist this data?
                        kadence.utils.getContactURL([
                            identity,
                            node.router.getContactByNodeId(identity)
                        ])
                    ];
                    joinNetwork(callback)
                });
            }
            this.ctx.log.info(`joining network from ${peers.length} seeds`);
            _async.detectSeries(peers, (url, done) => {
                const contact = kadence.utils.parseContactURL(url);
                node.join(contact, (err) => {
                    done(null, !err && node.router.size > 1);
                });
            }, (err, result) => {
                if (!result) {
                    this.ctx.log.error('Failed to join network, will retry in 1 minute');
                    callback(new Error('Failed to join network'));
                } else {
                    callback(null, result);
                }
            });
        };

        node.listen(parseInt(this.config.communication_port), () => {
            this.ctx.log.info(
                `node listening on local port ${parseInt(this.config.communication_port)} ` +
                `and exposed at https://${node.contact.hostname}:${node.contact.port}`
            );
            // registerControlInterface();
            // spawnSolverProcesses();
            _async.retry({
                times: Infinity,
                interval: 60000
            }, done => joinNetwork(done), (err, entry) => {
                if (err) {
                    this.ctx.log.error(err.message);
                    this.ctx.log.debug(err.stack);
                    process.exit(1);
                }
                this.ctx.log.info(`Connected to Kadence DHT network via ${entry}`);
                this.ctx.log.info(`Discovered ${node.router.size} peers from seed`);

                this.ctx.network.peersCount = node.router.size
            });
        });
    }

    patchKadence() {
        kadenceUtils.toPublicKeyHash = function(publicKey) {
            if (! Buffer.isBuffer(publicKey)) throw new Error('patched kadenceUtils.toPublicKeyHash: public key must be a Buffer');
            const keccakHashHex = ethUtil.keccak256(publicKey);
            const keccakHash = Buffer.from(keccakHashHex, 'hex');
            const address = keccakHash.slice(-20);
            return address;
        };
    }

}

module.exports = Kademlia;
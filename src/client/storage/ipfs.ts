import {Readable} from 'stream';
import {FastifyReply} from 'fastify';

import logger from '../../core/log';
import path from 'path';
import {DATADIR, HOST_PREFIXED_PUBSUB_PROLOGUE, HOST_PREFIXED_PUBSUB_ENCSIGN_PROLOGUE} from './config';
import {gunzipIfCompressed, hashFn, setSoon} from '../../util/index';
import {HttpNotFoundError} from '../../core/exceptions';
import {downloadVerifyDecryptFromIdentityForMe, VerifiedData} from '../encryption';
const log = logger.child({module: 'ipfs'});
const fs = require('fs');
// import {Message} from '@libp2p/interface-pubsub';
const socketIOClient = require('socket.io-client');

let _node: import('ipfs-core').IPFS;
let _creatingNode = false;
const _callbacksWaitingForNodeCreation: CallableFunction[] = [];

const sockets = new Map();
const topicCallbacks = new Map();

const ipfsRepoPath = path.join(DATADIR, 'ipfs');

// const IPFS = await(await Function('return import("ipfs-core")')() as Promise<typeof import('ipfs-core')>);
// import {create} from 'ipfs-core';
// const gossipsub = await(await Function('return import("@chainsafe/libp2p-gossipsub")')()).gossipsub;
// const GossipSub = gossipsub.GossipSub;
// const mplex = await(await Function('return import("@libp2p/mplex")')()).mplex;
// import {mplex} from '@libp2p/mplex';
// const noise = await(await Function('return import("@chainsafe/libp2p-noise")')()).noise;
// import {noise} from '@chainsafe/libp2p-noise';
// const webRTCStar = await(await Function('return import("@libp2p/webrtc-star")')()).webRTCStar;
// import {webRTCStar} from '@libp2p/webrtc-star';
// const WebRTCStar = webRTCStar.webRTCStar;

// const startIPFSNode = async() => {
//     const {spawn} = require('child_process');
//
//     const ipfsNode = spawn('node_modules/.bin/ipfs', ['daemon']);
//
//     process.on('exit', () => {
//         ipfsNode.kill();
//     });
//
//     ipfsNode.stdout.on('data', (data: any) => {
//         console.log(`stdout: ${data}`);
//     });
//
//     ipfsNode.stderr.on('data', (data: any) => {
//         console.error(`stderr: ${data}`);
//     });
//
//     ipfsNode.on('close', (code: any) => {
//         console.log(`child process exited with code ${code}`);
//     });
// };

const getIPFSNodeInstance = async(): Promise<import('ipfs-core').IPFS> => {
    // const {create} = await import('ipfs');
    const ipfsClient = require('ipfs-http-client');
    const create = ipfsClient.create;
    // const {gossipsub} = await import('@chainsafe/libp2p-gossipsub');
    // const {mplex} = await import ('@libp2p/mplex');
    // const {noise} = await import('@chainsafe/libp2p-noise');
    // const {webRTCStar} = await import('@libp2p/webrtc-star');

    if (!_node) {
        if (_creatingNode) {
            return new Promise((resolve, reject) => {
                try {
                    _callbacksWaitingForNodeCreation.push(resolve);
                } catch (e) {
                    reject(e);
                }
            });
        }

        _creatingNode = true;
        try {
            log.debug('Creating IPFS node instance');

            const repoLockDir = path.join(ipfsRepoPath, 'repo.lock');
            if (fs.existsSync(repoLockDir)) fs.rmSync(repoLockDir, {recursive: true});

            // const IPFS = await(await Function('return import("ipfs-core")')() as Promise<typeof import('ipfs-core')>);

            // const createLibp2p = await(await Function('return import("libp2p")')()).createLibp2p;
            // const tcp = await(await Function('return import("@libp2p/tcp")')()).tcp;
            // const pubsubPeerDiscovery = await(await Function('return import("@libp2p/pubsub-peer-discovery")')()).pubsubPeerDiscovery;
            // const KadDHT = await(await Function('return import("@libp2p/kad-dht")')()).KadDHT;
            // const MulticastDNS = await(await Function('return import("libp2p-mdns")')()).MulticastDNS;
            // const wrtc = await(await Function('return import("wrtc")')()).default;

            // const webRTC = webRTCStar({});

            const randomNumber = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

            const portStartRange = 10000;
            const portOffset = randomNumber(100, 500);
            const port = portStartRange + portOffset;

            _node = await create({
                repo: ipfsRepoPath,
                config: {
                    Addresses: {
                        Swarm: [
                            '/ip4/0.0.0.0/tcp/' + port,
                            '/ip6/::/tcp/' + port,
                            '/ip4/0.0.0.0/tcp/' + (port + 1) + '/ws',
                            // '/ip6/::/tcp/'+(port+1)+'/ws',
                            '/ip4/0.0.0.0/udp/' + port + '/quic',
                            '/ip6/::/udp/' + port + '/quic'
                            // '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
                        ],
                        Announce: [],
                        // AppendAnnounce: null, !!! todo
                        NoAnnounce: [],
                        // API: "/ip4/127.0.0.1/tcp/5012",
                        // Gateway: "/ip4/127.0.0.1/tcp/9191",
                        // RPC: "/ip4/127.0.0.1/tcp/4839",
                        API: '',
                        Gateway: ''
                    },
                    // Bootstrap: bootstapNodes,
                    // AutoNAT: {}, !!! todo
                    // Swarm: {
                    // EnableHolePunching: true, !!! todo
                    // EnableAutoRelay: true, !!! todo
                    // RelayClient: { !!! todo
                    //     Enabled: true,
                    //     // StaticRelays
                    // }, !!! todo
                    // RelayService: {
                    //     Enabled: false
                    // }
                    // },
                    Discovery: {
                        MDNS: {
                            Enabled: true,
                            Interval: 10
                        },
                        webRTCStar: {Enabled: true}
                    }
                },
                libp2p: {
                    // addresses: {
                    //     listen: [
                    //         '/ip4/0.0.0.0/tcp/' + port,
                    //         '/ip6/::/tcp/' + port,
                    //         '/ip4/0.0.0.0/tcp/' + (port+1),
                    //         '/ip6/::/tcp/' + (port+1),
                    //     ]
                    // },
                    // transports: [tcp()],
                    // peerDiscovery: [MulticastDNS],
                    // peerDiscovery: [
                    // pubsubPeerDiscovery(), // !!! todo
                    // webRTC.discovery
                    // MulticastDNS // !!! todo
                    // ],
                    // dht: { // !!! todo
                    //     enabled: true,
                    //     randomWalk: {
                    //         enabled: true
                    //     }
                    // },
                    relay: {                   // Circuit Relay options
                        enabled: true,           // Allows you to dial and accept relayed connections. Does not make you a relay.
                        // hop: {
                        //     enabled: true,         // Allows you to be a relay for other peers.
                        //     timeout: 30 * 1000,    // Incoming hop requests must complete within this timeout
                        //     applyConnectionLimits: true, // Apply data/duration limits to relayed connections (default: true)
                        //     limit: {
                        //         duration: 120 * 1000, // the maximum amount of ms a relayed connection can be open for
                        //         data: BigInt(1 << 17), // the maximum amount of data that can be transferred over a relayed connection
                        //     }
                        // },
                        // advertise: {
                        //     enabled: true,         // Allows you to disable advertising the Hop service
                        //     bootDelay: 15 * 60 * 1000, // Delay before HOP relay service is advertised on the network
                        //     ttl: 30 * 60 * 1000    // Delay Between HOP relay service advertisements on the network
                        // },
                        // reservationManager: {    // the reservation manager creates reservations on discovered relays // !!! todo
                        //     enabled: true,         // enable the reservation manager, default: false
                        //     maxReservations: 5,     // the maximum number of relays to create reservations on
                        //     maxListeners: 3,        // the maximum number of listeners to create per relay
                        // },
                        // active: true, // !!! todo
                        autoRelay: {
                            enabled: true
                            // maxListeners: 3
                        }
                    },
                    // dht: KadDHT,
                    // streamMuxers: [mplex()],
                    // connectionEncryption: [noise()],
                    // we add the Pubsub module we want
                    // pubsub: new gossipsub({
                    //     allowPublishToZeroPeers: true,
                    //     fallbackToFloodsub: true,
                    //     emitSelf: true,
                    //     maxInboundStreams: 64,
                    //     maxOutboundStreams: 128
                    // }),
                    // pubsub: floodsub(),

                    // transports: [tcp()],
                    // streamMuxers: [mplex()],
                    // connectionEncryption: [noise()],
                    // we add the Pubsub module we want
                    // pubsub: gossipsub({
                    //     allowPublishToZeroPeers: true,
                    //     fallbackToFloodsub: true,
                    //     emitSelf: true,
                    //     maxInboundStreams: 64,
                    //     maxOutboundStreams: 128
                    // }),

                    // pubsub: new GossipSub({
                    //     allowPublishToZeroPeers: true,
                    //     fallbackToFloodsub: true,
                    //     emitSelf: true,
                    //     maxInboundStreams: 64,
                    //     maxOutboundStreams: 128,
                    // }),
                    // connectionProtector: new PreSharedKeyConnectionProtector({
                    //     psk: new Uint8Array(Buffer.from(swarmKey, 'base64')),
                    // }),

                    datastore: undefined,
                    nat: {enabled: true}
                }
                // libp2p: (options) => {
                //     return createLibp2p({
                //         ...options.libp2pOptions,
                //         datastore: null
                //     })
                // },
            });

            for (const cb of _callbacksWaitingForNodeCreation) setSoon(function() {cb(_node);});

            _creatingNode = false;
        } catch (e) {
            _creatingNode = false;
            throw e;
        }
    }

    return _node;
};

export const getIPFSPeers = async() => {
    const node = await getIPFSNodeInstance();
    return await node.swarm.peers();
};

export const getIPFSPubsubPeers = async(res: FastifyReply, topic: string) => {
    const node = await getIPFSNodeInstance();
    return await node.pubsub.peers(topic);
};

export const getIPFSFileAsStream = async (url: string): Promise<Readable> => {
    try {
        const node = await getIPFSNodeInstance();

        if (!url.startsWith('/ipfs/') && !url.startsWith('ipfs://')) {
            throw new HttpNotFoundError('Invalid IPFS URL');
        }
        const catStream = await node.cat(url.replace('ipfs://', '/ipfs/'));

        const readable = new Readable();
        readable._read = () => {}; // _read is required but you can noop it
        for await (const chunk of catStream) {
            readable.push(chunk);
        }
        readable.push(null);
        return readable;
    } catch (e) {
        if (e.message.includes('nvalid argument') || e.message.includes('is a directory')) {
            throw new HttpNotFoundError(e.message);
        } else {
            throw e;
        }
    }
};

const PUBSUB_URL = 'wss://pubsub-1.point.space';
const connect = (topic: string) => {
    const topicHash = '0x' + require('crypto').createHash('sha256').update(topic).digest('hex');

    if (!sockets.has(topic)) {
        const socket = socketIOClient(PUBSUB_URL, {query: {topic: topicHash}});

        socket.on('connect', () => {
            log.debug(`WebSocket connection established for ${topic} / hash ${topicHash}`);
        });

        socket.on('error', (error: Error) => {
            log.error(`WebSocket connection error for ${topic}. Error: ${error}`);
        });

        socket.on('disconnect', (reason: string) => {
            log.debug(`WebSocket connection closed for ${topic}. Reason: ${reason}`);

            // handle reconnect
            setTimeout(() => {
                log.debug(`Reconnecting for ${topic}...`);
                socket.connect();
            }, 5000);
        });

        socket.on('message', (data: ArrayBuffer) => {
            // Convert ArrayBuffer to Buffer object
            const buffer = Buffer.from(data);

            // invoke all callbacks for the topic
            const callbacks = topicCallbacks.get(topic) || [];
            callbacks.forEach((callback: CallableFunction) => {
                callback(buffer);
            });
        });

        sockets.set(topic, socket);
    }
};

// pubsub
export const pubsubSubscribe = async(topic: string, callback: CallableFunction) => {
    // log.debug({topic}, 'pubsubSubscribe');
    //
    // const node = await getIPFSNodeInstance();
    // await node.pubsub.subscribe(topic, function(evt: Message) {
    //     log.debug({topic, evt}, 'received message');
    //     console.log({topic, evt})
    //     callback(evt);
    // });
    if (!sockets.has(topic)) {
        connect(topic);
    }

    if (!topicCallbacks.has(topic)) {
        topicCallbacks.set(topic, []);
    }

    topicCallbacks.get(topic).push(callback);
};

export const identityToTopic = (identity: string) => {
    // Note: this is not a secure way to obfuscate the identity, obviously
    const hash = hashFn(Buffer.from(identity)).toString('hex');
    return `_point_pubsub_id_${hash}`;
};
export const addressToTopic = (address: string) => {
    // Note: this is not a secure way to obfuscate the address, obviously
    const hash = hashFn(Buffer.from(address)).toString('hex');
    return `_point_pubsub_addr_${hash}`;
};

export const pubsubUnsubscribe = async(topic: string) => {
    if (sockets.has(topic)) {
        const socket = sockets.get(topic);
        socket.disconnect();
        sockets.delete(topic);
        topicCallbacks.delete(topic);
    }
};

export const pubsubProcessMessage = async(
    host: string, topic: string, data: Buffer, ignoreErrors: boolean, callback: CallableFunction
) => {
    // check prologue
    const prologue = data.slice(0, HOST_PREFIXED_PUBSUB_PROLOGUE.length);
    // compare buffers
    if (! prologue.equals(Buffer.from(HOST_PREFIXED_PUBSUB_PROLOGUE))) {
        if (ignoreErrors) {
            return;
        } else {
            throw new Error(`Invalid prologue: ${prologue} vs ${HOST_PREFIXED_PUBSUB_PROLOGUE}`);
        }
    }

    // check host
    const hostIndex = HOST_PREFIXED_PUBSUB_PROLOGUE.length;
    const hostEndIndex = data.indexOf('|', hostIndex);
    const messageHost = data.slice(hostIndex, hostEndIndex);
    if (messageHost.toString() !== host) {
        if (ignoreErrors) {
            return;
        } else {
            throw new Error(`Invalid host: ${messageHost}`);
        }
    }

    // if encrypted and sign, decrypt and verify
    const encsignPrologue = data.slice(
        hostEndIndex + 1, hostEndIndex + 1 + HOST_PREFIXED_PUBSUB_ENCSIGN_PROLOGUE.length
    );
    if (encsignPrologue.toString() !== HOST_PREFIXED_PUBSUB_ENCSIGN_PROLOGUE) {
        throw new Error(`Invalid encsign prologue: ${encsignPrologue}`);
    }

    const encryptedAndSignedData = data.slice(hostEndIndex + 1 + HOST_PREFIXED_PUBSUB_ENCSIGN_PROLOGUE.length);
    const verifiedData: VerifiedData = await downloadVerifyDecryptFromIdentityForMe(
        host, encryptedAndSignedData.toString()
    );

    // gunzip if compressed
    const final = await gunzipIfCompressed(verifiedData.data);

    // call callback
    callback(topic, final, verifiedData.identity);
};

export const pubsubPublish = async(topic: string, data: string) => {
    // const node = await getIPFSNodeInstance();
    // const dataUint8Array = new TextEncoder().encode(data);
    // await node.pubsub.publish(topic, dataUint8Array);

    // use the first available socket or create a new one with an empty topic
    const socket = [...sockets.values()][0] || connect('');

    const topicHash = '0x' + require('crypto').createHash('sha256').update(topic).digest('hex');
    const messageBuffer = Buffer.from(data);
    const messageData = Buffer.concat([Buffer.from('msg'), Buffer.from(topicHash), messageBuffer]);
    socket.send(messageData);
};

// try start it from the beginning
(async() => {
    // startIPFSNode();
    // return;

    _node = await getIPFSNodeInstance();

    // pubsub subscribe
    // assert account is a string

    // const accountHashed: string = hashFn(Buffer.from(account)).toString('hex');
    //
    // const topic = '_point_general_' + account;
    // log.debug({topic});
    // const topic = 'applejuice';
    // const topic2 = 'test';
    //
    // let account = await getWalletAddress({});
    // if (typeof account !== 'string' && account instanceof PublicKey) {
    //     account = account.toBase58();
    // }
    // await pubsubSubscribe(addressToTopic(account), (a:any, b:any, c:any) => {
    //     log.debug({account, a,b,c}, 'Received pubsub message for address');
    // });
    //
    // const identity = (await getIdentity()).identity;
    // if (identity) {
    //     await pubsubSubscribe(identityToTopic(identity), (msg: any) => {
    //         pubsubProcessMessage('aitest.sergedeployer.local', identity, msg, false, (topic: string, message: string) => {
    //             log.debug({topic, message, identity, msg}, 'Received pubsub message for identity');
    //         });
    //     });
    // }

    // await pubsubSubscribe(topic2, (msg: any) => {
    //
    //     log.debug({topic2, msg}, 'Received pubsub message');
    // });
    //
    // setTimeout(async function() {
    //     // await _node.swarm.connect('/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star');
    // }, 2000);
    //
    // setInterval(async function() {
    //     log.debug('peers: ' + (await _node.swarm.peers()).length);
    //     log.debug('peers topic '+topic +': '+ (await _node.pubsub.peers(topic)).length);
    // }, 1000);
    //
    // setTimeout(function() {
    //     const topic = '_point_general_' + account;
    //     const dataString = 'hello';
    //     // const dataUint8Array = new TextEncoder().encode(dataString);
    //     pubsubPublish(topic, dataString);
    // }, 5000);
})();

// setTimeout(testEncryption, 10000);

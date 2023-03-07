import {Readable} from 'stream';
import {FastifyReply} from 'fastify';

import logger from '../../core/log';
import path from 'path';
import {DATADIR} from './config';
import {hashFn, setSoon} from '../../util';
import {HttpNotFoundError} from '../../core/exceptions';
import {getWalletAddress} from '../../wallet';
const log = logger.child({module: 'ipfs'});
const fs = require('fs');
import {Message} from '@libp2p/interface-pubsub';

let _node: import('ipfs-core').IPFS;
let _creatingNode = false;
const _callbacksWaitingForNodeCreation: CallableFunction[] = [];

const ipfsRepoPath = path.join(DATADIR, 'ipfs');

const getIPFSNodeInstance = async(): Promise<import('ipfs-core').IPFS> => {
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

            const IPFS = await(await Function('return import("ipfs-core")')() as Promise<typeof import('ipfs-core')>);

            // const createLibp2p = await(await Function('return import("libp2p")')()).createLibp2p;
            const gossipsub = await(await Function('return import("@chainsafe/libp2p-gossipsub")')()).gossipsub;
            // const tcp = await(await Function('return import("@libp2p/tcp")')()).tcp;
            const mplex = await(await Function('return import("@libp2p/mplex")')()).mplex;
            const noise = await(await Function('return import("@chainsafe/libp2p-noise")')()).noise;

            _node = await IPFS.create({
                repo: ipfsRepoPath,
                libp2p: {
                    // addresses: {
                    //     listen: ['/ip4/0.0.0.0/tcp/0']
                    // },
                    // transports: [tcp()],
                    streamMuxers: [mplex()],
                    connectionEncryption: [noise()],
                    // we add the Pubsub module we want
                    pubsub: new gossipsub({
                        allowPublishToZeroPeers: true,
                        fallbackToFloodsub: true,
                        emitSelf: true,
                        maxInboundStreams: 64,
                        maxOutboundStreams: 128
                    }),
                    datastore: undefined,

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

// pubsub
export const pubsubSubscribe = async(topic: string, callback: CallableFunction) => {
    log.debug({topic}, 'pubsubSubscribe');

    const node = await getIPFSNodeInstance();
    await node.pubsub.subscribe(topic, function(evt: Message) {
        log.debug({topic, evt}, 'received message');
        callback(evt);
    });
};

export const pubsubPublish = async(topic: string, data: string) => {
    const node = await getIPFSNodeInstance();
    const dataUint8Array = new TextEncoder().encode(data);
    await node.pubsub.publish(topic, dataUint8Array);
};

// try start it from the beginning
(async() => {
    _node = await getIPFSNodeInstance();

    // pubsub subscribe
    const account = await getWalletAddress({});
    // assert account is a string
    if (typeof account !== 'string') throw new Error('Invalid account');

    const accountHashed: string = hashFn(Buffer.from(account)).toString('hex');
    log.debug({accountHashed});

    // const topic = '_point_general_' + accountHashed;
    const topic = 'applejuice';

    await pubsubSubscribe(topic, (msg: any) => {
        log.debug({topic, msg}, 'Received pubsub message');
    });

    setTimeout(async function() {
        // await _node.swarm.connect('/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star');
    }, 2000);

    setInterval(async function() {
        log.debug(await _node.swarm.peers());
        log.debug(await _node.pubsub.peers(topic));
    }, 1000);

    setTimeout(function() {
        const dataString = 'hello';
        // const dataUint8Array = new TextEncoder().encode(dataString);
        pubsubPublish(topic, dataString);
    }, 5000);
})();

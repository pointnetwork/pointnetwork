const Chunk = require('../../db/models/chunk');
const File = require('../../db/models/file');
const Redkey = require('../../db/models/redkey');
const StorageLink = require('../../db/models/storage_link');
const DB = require('../../db');
const path = require('path');
const { fork } = require('child_process');
const _ = require('lodash');
const fs = require('fs');
const lock = require('level-lock');

class Storage {
    constructor(ctx) {
        this.ctx = ctx;
        this.config = ctx.config.client.storage;
        this.current_requests = {};
        this.queued_requests = {};
        this.uploadingChunksProcessing = {};
    }

    async start() {
        await this.init();

        // todo: rewrite with threads!
        this.timeout = this.ctx.config.simulation_delay;
        this.timerFn = null;
        this.timerFn = async() => {
            await this.tick();
            setTimeout(this.timerFn, this.timeout);
        };
        this.timerFn();
    }

    async init() {
        // todo
    }

    async enqueueFileForUpload(
        path,
        redundancy = this.ctx.config.client.storage.default_redundancy,
        expires = (new Date).getTime() + this.ctx.config.client.storage.default_expires_period_seconds,
        autorenew = this.ctx.config.client.storage.default_autorenew
    ) {
        // Create at first to be able to chunkify and get the file id (hash), later we'll try to load it if it already exists
        let file = File.new();
        file.localPath = path; // todo: should we rename it to lastLocalPath or something? or store somewhere // todo: validate it exists
        await file.chunkify(); // to receive an id (hash)

        const existingFile = File.find(file.id);
        if (existingFile === null) {
            file = existingFile;
        }

        file.redundancy = Math.max(parseInt(file.redundancy)||0, parseInt(redundancy)||0);
        file.expires = Math.max(parseInt(file.expires)||0, parseInt(expires)||0);
        file.autorenew = (!!file.autorenew) ? !!file.autorenew : !!autorenew;
        await file.save();
        await file.reconsiderUploadingStatus();

        // We don't wait for the file to be uploaded, we just return the file id, using which we can query its upload status

        // todo: when do we update expires and save again?

        return file.id;
    }

    // todo: make sure the network is properly initialized etc.
    async putFile(
        path,
        redundancy = this.config.default_redundancy,
        expires = (new Date).getTime() + this.config.default_expires_period_seconds,
        autorenew = this.config.default_autorenew)
    {
        const file_id = await this.enqueueFileForUpload(path, redundancy, expires, autorenew);

        let waitUntilUpload = (resolve, reject) => {
            setTimeout(async() => {
                let file = await File.find(file_id);
                if (file.ul_status === File.UPLOADING_STATUS_UPLOADED) {
                    resolve(file);
                } else {
                    waitUntilUpload(resolve, reject);
                }
            }, 100); // todo: change interval?
        };

        setTimeout(() => {
            this.tick('uploading');
        }, 0);

        return new Promise(waitUntilUpload);
    }

    async enqueueFileForDownload(id, localPath) {
        if (!id) throw new Error('undefined or null id passed to storage.enqueueFileForDownload');
        let file = await File.findOrCreate(id);
        // if (! file.localPath) file.localPath = '/tmp/'+id; // todo: put inside file? use cache folder?
        if (! file.localPath) file.localPath = localPath; // todo: put inside file? use cache folder? // todo: what if multiple duplicate files with the same id?
        if (file.dl_status !== File.DOWNLOADING_STATUS_DOWNLOADED) {
            file.dl_status = File.DOWNLOADING_STATUS_DOWNLOADING_CHUNKINFO;
            await file.save();
            await file.reconsiderDownloadingStatus();
        }

        return file.id;
    }

    async getFile(id, localPath) {
        if (!id) throw new Error('undefined or null id passed to storage.getFile');
        await this.enqueueFileForDownload(id, localPath);
        let waitUntilRetrieval = (resolve, reject) => {
            setTimeout(async() => {
                let file = await File.find(id);
                if (file.dl_status === File.DOWNLOADING_STATUS_DOWNLOADED || file.dl_status === File.DOWNLOADING_STATUS_FAILED) {
                    resolve(file);
                } else {
                    waitUntilRetrieval(resolve, reject);
                }
            }, 100); // todo: change interval?
        };

        setTimeout(() => {
            this.tick('downloading');
        }, 0);

        return new Promise(waitUntilRetrieval);
    }

    async readFile(id, encoding = null) {
        if (!id) throw new Error('undefined or null id passed to storage.readFile');
        id = id.replace('0x', '').toLowerCase();
        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        this.ctx.utils.makeSurePathExists(cache_dir);
        const tmpFileName = path.join(cache_dir, 'file_' + id);
        const file = await this.getFile(id, tmpFileName);
        return file.getData(encoding);
    }

    async readJSON(id) {
        let contents = await this.readFile(id, 'utf-8'); // todo: check fsize sanity check if routes or something
        try {
            return JSON.parse(contents); // todo: what if error? SyntaxError: Unexpected token < in JSON at position 0
        } catch(e) {
            return undefined;
        }
    }

    async tick(mode = 'all') {
        // todo

        // todo:  you should queue the commands you are given
        // todo:  join the network from the raiden wallet
        // todo:  .get(data_id)
        // todo:  .put(data, ) returns data_id

        if (mode === 'all' || mode === 'uploading') {
            let uploadingChunks = await Chunk.allBy('ul_status', Chunk.UPLOADING_STATUS_UPLOADING);
            uploadingChunks.forEach((chunk) => {
                setImmediate(async() => { // not waiting, just queueing for execution
                    await this.chunkUploadingTick(chunk);
                });
            });
        }

        if (mode === 'all' || mode === 'downloading') {
            let downloadingChunks = await Chunk.allBy('dl_status', Chunk.DOWNLOADING_STATUS_DOWNLOADING);
            downloadingChunks.forEach((chunk) => { // not waiting, just queueing for execution
                setImmediate(async() => {
                    await this.chunkDownloadingTick(chunk);
                });
            });
        }
    }

    async chooseProviderCandidate() {
        const id = this.ctx.config.hardcode_default_provider; // todo
        return await this.ctx.db.provider.findOrCreateAndSave(id);
        // todo: remove blacklist from options
        // todo: remove those already in progress or failed in this chunk
    }
    async pickProviderToStoreWith() {
        // todo: pick the cheapest, closest storage providers somehow (do whatever's easy at first)
        // todo: don't pick the one you already store it with
        // conditions:
        // - it has cheapest fees
        // - it's online - ping it (remote ping possible?)
        // - you have a financial connection
        // - cycle until you find one
        // return ['989695771d51de19e9ccb943d32e58f872267fcc', {'protocol':'http:', 'hostname':'127.0.0.1', 'port':'12345'}];
        return this.this.ctx.utils.urlToContact( await this.chooseProviderCandidate() );
        // return 'http://127.0.0.1:12345/#989695771d51de19e9ccb943d32e58f872267fcc'; // test1 // TODO!
    }

    async chunkDownloadingTick(chunk) {
        // todo todo todo: make it in the same way as chunkUploadingTick - ??

        if (chunk.dl_status !== Chunk.DOWNLOADING_STATUS_DOWNLOADING) return;

        let provider = await this.chooseProviderCandidate(); // todo: what if no candidates available? this case should be processed

        this.send('GET_DECRYPTED_CHUNK', [chunk.id], provider.id, async(err, result) => { // todo: also send conditions
            if (err) {
                console.log(err); // todo: for some reason, throw err doesn't display the error

                if (_.startsWith(err, 'Error: ECHUNKNOTFOUND')) {
                    chunk.dl_status = Chunk.DOWNLOADING_STATUS_FAILED;
                    await chunk.save();
                    await chunk.reconsiderDownloadingStatus(true);
                    return;
                } else throw err;
            } // todo

            const chunk_id = result[0]; // todo: validate
            const data = result[1]; // todo: validate that it's buffer

            chunk.setData(data); // todo: what if it errors out?
            chunk.dl_status = Chunk.DOWNLOADING_STATUS_DOWNLOADED;
            await chunk.save();
            await chunk.reconsiderDownloadingStatus(true);
        });
    }

    async SEND_STORE_CHUNK_REQUEST(chunk, link) {
        return new Promise((resolve, reject) => {
            this.send('STORE_CHUNK_REQUEST', [chunk.id, chunk.getLength(), chunk.expires], link.provider_id, async(err, result) => {
                await link.refresh();
                (!err) ? resolve(true) : reject(err) // machine will move to next state
            });
        });
    }

    async ENCRYPT_CHUNK(chunk, link) {
        if (!this.chunk_encryptors) {
            this.chunk_encryptors = {};
        }
        return new Promise(async(resolve, reject) => {
            let chunk_encryptor = fork(path.join(this.ctx.basepath, 'threads/encrypt.js'));
            this.chunk_encryptors[chunk.id + link.id] = chunk_encryptor;

            chunk_encryptor.on('message', async (message) => {
                if (message.command === 'encrypt' && message.success === true) {
                    // Let's calculate merkle tree
                    const SEGMENT_SIZE_BYTES = this.ctx.config.storage.segment_size_bytes; // todo: check that it's not 0/null or some weird value
                    const data = link.getEncryptedData();
                    const data_length = data.length;
                    let segment_hashes = [];
                    for (let i = 0; i < Math.ceil(data_length / SEGMENT_SIZE_BYTES); i++) { // todo: separate into encryption section
                        // Note: Buffer.slice is (start, end) not (start, length)
                        segment_hashes.push(this.ctx.utils.hashFn(data.slice(i * SEGMENT_SIZE_BYTES, i * SEGMENT_SIZE_BYTES + SEGMENT_SIZE_BYTES)));
                    }

                    const merkleTree = this.ctx.utils.merkle.merkle(segment_hashes, this.ctx.utils.hashFn);

                    await link.refresh();
                    // link.status = StorageLink.STATUS_ENCRYPTED;
                    link.encrypted_hash = message.hash;
                    link.encrypted_length = data_length;
                    link.segment_hashes = segment_hashes.map(x => x.toString('hex'));
                    link.merkle_tree = merkleTree.map(x => x.toString('hex'));
                    link.merkle_root = link.merkle_tree[link.merkle_tree.length - 1].toString('hex');
                    // cleanup chunk encryptor
                    let chunk_encryptor = this.chunk_encryptors[chunk.id + link.id];
                    chunk_encryptor.kill('SIGINT');
                    delete this.chunk_encryptors[chunk.id + link.id];

                    resolve(true); // machine will move to next state
                } else {
                    console.warn('Something is wrong, encryptor for chunk ' + chunk.id + ' returned ', message);
                    this.ctx.die();
                    reject('Something is wrong, encryptor for chunk ' + chunk.id + ' returned ' + message);
                }
            });
            // todo: do we need this?
            chunk_encryptor.addListener("output", function (data) {
                console.log('Chunk Encryptor output: ' + data);
            });
            // todo: two error listeners?
            chunk_encryptor.addListener("error", async (data) => { // todo
                await link.refresh();
                link.status = StorageLink.STATUS_FAILED;
                link.error = data;
                link.errored = true;
                await link.save();
                reject('Chunk encryption FAILED:' + link.error);
            });
            chunk_encryptor.on("error", async (data) => { // todo
                await link.refresh();
                link.status = StorageLink.STATUS_FAILED;
                link.error = data;
                link.errored = true;
                await link.save();
                reject('Chunk encryption FAILED:' + link.error);
            });
            chunk_encryptor.on("exit", async (code) => {
                if (code === 0 || code === null) {
                    // do nothing
                } else {
                    // todo: figure out which one is failed
                    link.status = StorageLink.STATUS_FAILED;
                    //link.error = data;
                    await link.save();
                    reject('Chunk encryption FAILED, exit code' + code);
                }
            });

            const privKey = (await link.getRedkey()).priv;

            chunk_encryptor.send({
                command: 'encrypt',
                filePath: Chunk.getChunkStoragePath(chunk.id),
                privKey: privKey,
                chunkId: chunk.id,
                linkId: link.id
            });
        });
    }

    async SEND_STORE_CHUNK_SEGMENTS(data, link) {
        return new Promise(async(resolve, reject) => {
            this.send('STORE_CHUNK_SEGMENTS', data, link.provider_id, async (err, result) => {
                await link.refresh();
                (!err) ? resolve(true) : reject(err) // machine will move to next state
            });
        });
    }

    async SEND_STORE_CHUNK_DATA(data, link) {
        return new Promise((resolve, reject) => {
            this.send('STORE_CHUNK_DATA', data, link.provider_id, async (err, result) => {
                await link.refresh();
                let idx = data[1]
                const totalSegments = link.segment_hashes.length;
                if (!err) {
                    // todo: use the clues server gives you about which segments it already received (helps in case of duplication?)
                    if (!link.segments_received) link.segments_received = [];
                    link.segments_received.push(idx);
                    link.segments_received = _.uniq(link.segments_received);
                    if (Object.keys(link.segments_received).length >= totalSegments) {
                        link.segments_received = null; // todo: delete completely, by using undefined?
                        link.segments_sent = null; // todo: delete completely, by using undefined?
                    }
                    resolve(true);
                } else {
                    reject(err);
                }
            });
        });
    }

    async SEND_STORE_CHUNK_SIGNATURE_REQUEST(link) {
        return new Promise((resolve, reject) => {
            this.send('STORE_CHUNK_SIGNATURE_REQUEST', [link.merkle_root], link.provider_id, async (err, result) => {
                await link.refresh();
                try {
                    if (err) reject('Provider responded with: ' + err); // todo

                    // Verify the signature
                    const chunk_id = result[0]; // todo: validate
                    const signature = result[1];

                    // todo: now count the debt
                    // todo: and finally pay it before your next request

                    let conditions = {
                        chunk_id: link.merkle_root
                    }; // todo // also todo combined pledge?

                    link.pledge = {
                        conditions,
                        signature
                    };
                    link.validatePledge();

                    // const chunk = await link.getChunk();
                    // await chunk.reconsiderUploadingStatus(true); <-- already being done after this function is over, if all is good, remove this block

                    resolve(true);
                } catch (e) {
                    // todo: don't just put this into the console, this is for debugging purposes
                    console.debug('FAILED CHUNK', {err, result}, chunk.id, e);
                    reject(e);
                }
            });
        });
    }

    // todo: move to client/storage
    async chunkUploadingTick(chunk) {
        if (this.uploadingChunksProcessing[chunk.id]) return;
        this.uploadingChunksProcessing[chunk.id] = true;

        await chunk.refresh();
        if (chunk.ul_status !== Chunk.UPLOADING_STATUS_UPLOADING) return;

        // Remove candidates that didn't respond within timeout period
        // todo

        // Push some candidates if not enough
        const all = await chunk.storage_links[ StorageLink.STATUS_ALL ];
        const candidates = await chunk.storage_links[ StorageLink.STATUS_CREATED ];
        const failed = await chunk.storage_links[ StorageLink.STATUS_FAILED ];
        const inProgressOrLiveCount = all.length - failed.length;
        const candidatesRequiredCount = chunk.redundancy - inProgressOrLiveCount;
        const additionalCandidatesRequired = candidatesRequiredCount - candidates.length;

        if (additionalCandidatesRequired > 0) {
            // for(let i=0; i < additionalCandidatesRequired; i++) { // todo when you implement real provider choice & sort out the situation when no candidates available
            let provider = await this.chooseProviderCandidate(); // todo: what if no candidates available? this case should be processed // todo optimize: maybe only supply id
            let link = StorageLink.new();
            link.id = DB.generateRandomIdForNewRecord();
            link.provider = provider;
            link.redkeyId = await this.getRedkeyId(provider);
            link.chunk_id = chunk.id;
            link.initStateMachine(chunk)
            // use storage link state machine to sent CREATE event
            link.machine.send('CREATE')
        }

        for(let link of all) {
            const requests_length = (this.current_requests[link.provider_id]) ? this.current_requests[link.provider_id].length : 0;
            const queued_length = (this.queued_requests[link.provider_id]) ? this.queued_requests[link.provider_id].length : 0;
            console.debug(chunk.id, link.id, Object.keys(link.segments_sent ? link.segments_sent : {}).map(Number), link.segments_received, link.status, (link.status==='failed')?link.error:'', {requests_length, queued_length});
        }

        // todo: what about expiring and renewing?
    }

    send(cmd, data, contact, callback) {
        const request = {
            'internal_id': (new Date).getTime().toString() + Math.random().toString(),
            cmd, data, contact, callback
        };

        if (!this.queued_requests[contact]) this.queued_requests[contact] = [];
        this.queued_requests[contact].push(request);

        this.sendQueued(contact);
    }

    sendQueued(contact) {
        const MAX_PARALLEL_PER_PROVIDER = this.ctx.config.client.max_parallel_requests_per_provider;
        const requests_length = (this.current_requests[contact]) ? this.current_requests[contact].length : 0;
        if (requests_length < MAX_PARALLEL_PER_PROVIDER && this.queued_requests[contact] && this.queued_requests[contact].length > 0) {
            const req = this.queued_requests[contact].shift();

            if (!this.current_requests[contact]) this.current_requests[contact] = [];
            this.current_requests[contact].push(req);

            return this.ctx.network.kademlia.node.send(req.cmd, req.data, this.ctx.utils.urlToContact(contact), (err, result) => {
                this.current_requests = _.remove(this.current_requests, function(n) {
                    return n.internal_id === req.internal_id;
                });
                this.sendQueued(contact);
                req.callback(err, result);
            });
        }
    }

    isProviderQueueFull(contact) {
        const MAX_PARALLEL_PER_PROVIDER = this.ctx.config.client.max_parallel_requests_per_provider;
        const requests_length = (this.current_requests[contact]) ? this.current_requests[contact].length : 0;
        const queued_length = (this.queued_requests[contact]) ? this.queued_requests[contact].length : 0;
        return (requests_length+queued_length >= MAX_PARALLEL_PER_PROVIDER);
    }

    async ___getChunk(chunk_id) {
        // FIND_NODE / FIND_VALUE / STORE should not be paid for for now
        // You have to change FIND_VALUE to turn it into array
        // 1. iterativeFindValues - get results
        // filter out banned nodes
        // 2. see whether you have financial connections to those nodes (and channel with enough funds), filter out everybody else
        // as per raiden docs:
        // POST /api/v1/payments/0x0f114A1E9Db192502E7856309cc899952b3db1ED/0x61C808D82A3Ac53231750daDc13c777b59310bD9 HTTP/1.1
        // + the nodes that are online todo: remote ping? possible?
        // + take the closest ones
        // 3. poll nodes (even distant ones) and ask them if they still have the chunk and if they're online, and already offer them to pay for the chunk
        // 4. start paying as soon as they send you first data. ban each other if the deal goes wrong after payment
        // todo: what if they send you invalid data? you can only check integrity after you receive the whole chunk, right? maybe the chunk should be the merkle tree as well?
    }

    async removeChunk() { /*todo*/ }

    async getRedkeyId(provider) {
        // Note: locking here is important because of concurrency issues. I've spent hours debugging random errors in
        // encryption when it turned out that several keys were generated for the same provider at once and they were
        // all mixed up when they were actually sent to the service provider, which made for invalid decryption

        let unlock = lock(this.ctx.db._db, 'redkey'+'!'+provider.id, 'w');
        if (!unlock) {
            return new Promise((resolve, reject) => {
                setTimeout(async() => {
                    resolve(await this.getRedkeyId(provider));
                }, 100);
            });
        }

        let keys = await Redkey.allByProvider(provider);
        if (keys.length === 0) {
            // Generate a new one

            const keyIndex = 0;
            try {
                let redkey = await Redkey.generateNewForProvider(provider, keyIndex);
                unlock();
                return redkey.id;
            } catch(e) {
                unlock();
                throw e;
            }

        } else {
            // Return existing
            unlock();
            return keys[0].id;
        }

        // todo: multiple?
    }
}

module.exports = Storage;
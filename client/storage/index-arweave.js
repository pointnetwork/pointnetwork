const Chunk = require('../../db/models/chunk');
const File = require('../../db/models/file');
const Redkey = require('../../db/models/redkey');
const Directory = require('../../db/models/directory');
const Provider = require('../../db/models/provider');
const StorageLink = require('../../db/models/storage_link');
const Model = require('../../db/model');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const utils = require('#utils');
const Arweave = require('arweave');
const { request, gql } = require('graphql-request');
const axios = require('axios');

class StorageArweave {
    constructor(ctx) {
        this.ctx = ctx;
        this.log = ctx.log.child({module: 'StorageArweave'});
        this.config = ctx.config.client.storage;
        this.current_requests = {};
        this.queued_requests = {};
        this.uploadingChunksProcessing = {};

        if (!this.config.arweave_experiment_version_major) throw Error('arweave_experiment_version_major not set or is 0');
        if (!this.config.arweave_experiment_version_minor) throw Error('arweave_experiment_version_minor not set or is 0');
        this.__PN_TAG_INTEGRATION_VERSION_MAJOR = ''+this.config.arweave_experiment_version_major;
        this.__PN_TAG_INTEGRATION_VERSION_MINOR = ''+this.config.arweave_experiment_version_minor;
        this.__PN_TAG_VERSION_MAJOR_KEY = '__pn_integration_version_major';
        this.__PN_TAG_VERSION_MAJOR_VALUE = this.__PN_TAG_INTEGRATION_VERSION_MAJOR;
        this.__PN_TAG_VERSION_MINOR_KEY = '__pn_integration_version_minor';
        this.__PN_TAG_VERSION_MINOR_VALUE = this.__PN_TAG_INTEGRATION_VERSION_MINOR;
        this.__PN_TAG_CHUNK_ID_KEY = '__pn_chunk_id';
        this.__PN_TAG_VERSIONED_CHUNK_ID_KEY = '__pn_chunk_'+this.__PN_TAG_INTEGRATION_VERSION_MAJOR+'.'+this.__PN_TAG_INTEGRATION_VERSION_MINOR+'_id';

        this.BUNDLER_URL ="https://bundler.arweave.net";
    }

    hasArweaveKey() {
        return !!this.config.arweave_key;
    }

    getArweaveKey() {
        const key = this.config.arweave_key;
        if (!key) throw Error('No arweave key set');
        return key;
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
        this.arweave = Arweave.init({
            // host: '127.0.0.1',
            // port: 1984,
            // protocol: 'http'
            port: 443,
            protocol: 'https',
            host: 'arweave.net',
            // timeout: 20000,     // Network request timeouts in milliseconds
            logging: this.log.debug.bind(this.log), // Enable network request logging
        });
    }

    async enqueueFileForUpload(
        filePath,
        redundancy = this.ctx.config.client.storage.default_redundancy,
        expires = (new Date).getTime() + this.ctx.config.client.storage.default_expires_period_seconds,
        autorenew = this.ctx.config.client.storage.default_autorenew
    ) {
        // Create at first to be able to chunkify and get the file id (hash), later we'll try to load it if it already exists
        let throwAwayFile = File.build();
        throwAwayFile.original_path = filePath; // todo: should we rename it to lastoriginalPath or something? or store somewhere // todo: validate it exists
        await throwAwayFile.chunkify(); // to receive an id (hash) // Note: this will .save() it!

        // Setting `originalPath` to the `chunkify`ed version of `file`,
        // instead of the path where we find the original file source.
        // This is necessary because if not done it brokes the ZApps after deployment.
        const original_path = path.join(this.getCacheDir(), 'chunk_'+throwAwayFile.id);

        const file = (await File.findByIdOrCreate(throwAwayFile.id, {original_path}));

        // todo: validate redundancy, expires and autorenew fields. merge them if they're already there
        file.redundancy = Math.max(parseInt(file.redundancy)||0, parseInt(redundancy)||0);
        file.expires = Math.max(parseInt(file.expires)||0, parseInt(expires)||0);
        file.autorenew = !!file.autorenew || !!autorenew;
        file.original_path = original_path;
        await file.save();
        await file.reconsiderUploadingStatus();

        // We don't wait for the file to be uploaded, we just return the file id, using which we can query its upload status

        // todo: when do we update expires and save again?

        return file.id;
    }

    async enqueueDirectoryForUpload(
        dirPath,
        redundancy = this.ctx.config.client.storage.default_redundancy,
        expires = (new Date).getTime() + this.ctx.config.client.storage.default_expires_period_seconds,
        autorenew = this.ctx.config.client.storage.default_autorenew
    ) {
        const directory = new Directory(this.ctx);
        directory.setOriginalPath(dirPath);
        directory.addFilesFromOriginalPath();

        // Now process every item
        for(const f of directory.files) {
            if (f.type === 'fileptr') {
                const uploaded = await this.putFile(f.original_path, redundancy, expires, autorenew);
                f.id = uploaded.id;
            } else if (f.type === 'dirptr') {
                const uploaded = await this.putDirectory(f.original_path, redundancy, expires, autorenew);
                f.id = uploaded.id;
            } else {
                throw Error('invalid type: '+f.type);
            }
        }

        // Get an id here:

        const tmpFilePath = path.join(this.getCacheDir(), 'dir-tmp-'+utils.hashFnUtf8Hex(dirPath));
        directory.serializeToFile(tmpFilePath);

        let uploadedDirSpec = await this.putFile(tmpFilePath, redundancy, expires, autorenew);
        let uploadedDirSpecId = uploadedDirSpec.id;

        // We don't wait for the dir to be uploaded, we just return the dir id, using which we can query its upload status

        // todo: when do we update expires and save again?

        return uploadedDirSpecId;
    }

    async putDirectory(
        dirPath,
        redundancy = this.config.default_redundancy,
        expires = (new Date).getTime() + this.config.default_expires_period_seconds,
        autorenew = this.config.default_autorenew)
    {
        if (!fs.existsSync(dirPath)) throw Error('client/storage/index.js: Directory '+utils.escape(dirPath)+' does not exist');
        if (!fs.statSync(dirPath).isDirectory()) throw Error('dirPath '+utils.escape(dirPath)+' is not a directory');

        const directory_id = await this.enqueueDirectoryForUpload(dirPath, redundancy, expires, autorenew);
        let waitUntilUpload = (resolve, reject) => {
            setTimeout(async() => {
                try {
                    let file = await File.findOrFail(directory_id);
                    if (file.ul_status === File.UPLOADING_STATUS_UPLOADED) {
                        resolve(file);
                    } else {
                        waitUntilUpload(resolve, reject);
                    }
                } catch(e) {
                    reject(e);
                }
            }, 100); // todo: change interval? // todo: make it event-based rather than have thousands of callbacks waiting every 100ms
        };

        setTimeout(() => {
            this.tick('uploading');
        }, 0);

        return new Promise(waitUntilUpload);
    }

    // todo: make sure the network is properly initialized etc.
    async putFile(
        filePath,
        redundancy = this.config.default_redundancy,
        expires = (new Date).getTime() + this.config.default_expires_period_seconds,
        autorenew = this.config.default_autorenew)
    {
        this.log.debug({filePath, redundancy, expires, autorenew}, 'Enqueuing file for upload');
        const file_id = await this.enqueueFileForUpload(filePath, redundancy, expires, autorenew);
        this.log.debug({filePath, redundancy, expires, autorenew}, 'Enqueued file for upload');
        let waitUntilUpload = (resolve, reject) => {
            setTimeout(() => {
                (async() => {
                    try {
                        let file = await File.findOrFail(file_id);
                        if (file.ul_status === File.UPLOADING_STATUS_UPLOADED) {
                            resolve(file);
                        } else if (file.ul_status === File.UPLOADING_STATUS_FAILED) {
                            reject(new Error('putFile: File failed to upload'));
                        } else {
                            waitUntilUpload(resolve, reject);
                        }
                    } catch(e) {
                        reject(e);
                    }
                })();
            }, 100); // todo: change interval? // todo: make it event-based rather than have thousands of callbacks waiting every 100ms
        };

        setTimeout(() => {
            this.tick('uploading');
        }, 0);

        const promise = new Promise(waitUntilUpload);
        const response = await promise;
        return response;
    }

    async getFile(id) {
        if (!id) throw new Error('undefined or null id passed to storage.getFile');

        // already downloaded?
        const originalPath = File.getStoragePathForId(id);
        const file = (await File.findByIdOrCreate(id, { original_path: originalPath }));
        if (file.dl_status === File.DOWNLOADING_STATUS_DOWNLOADED) {
            return file;
        }

        let chunkinfo_chunk = await Chunk.findByIdOrCreate(file.id);
        if (chunkinfo_chunk.dl_status === Chunk.DOWNLOADING_STATUS_FAILED || chunkinfo_chunk.dl_status === Chunk.DOWNLOADING_STATUS_CREATED) {
            chunkinfo_chunk.dl_status = Chunk.DOWNLOADING_STATUS_READY_TO_DOWNLOAD;
            await chunkinfo_chunk.save();
            await this.downloadChunk(chunkinfo_chunk);
        }

        if (file.chunkIds && file.chunkIds.length > 0) {
            await Promise.all(file.chunkIds.map(async(chunk_id, i) => {
                let chunk = await Chunk.findByIdOrCreate(chunk_id);
                if (chunk.dl_status === Chunk.DOWNLOADING_STATUS_FAILED || chunk.dl_status === Chunk.DOWNLOADING_STATUS_CREATED) {
                    chunk.dl_status = Chunk.DOWNLOADING_STATUS_READY_TO_DOWNLOAD;
                    await chunk.save();
                    await this.downloadChunk(chunk);
                }
            }));
        }

        file.dl_status = File.DOWNLOADING_STATUS_DOWNLOADING_CHUNKINFO;
        await file.save();
        await file.reconsiderDownloadingStatus();

        let waitUntilRetrieval = (resolve, reject) => {
            setTimeout(async() => {
                try {
                    let file = await File.findOrFail(id);
                    if (file.dl_status === File.DOWNLOADING_STATUS_DOWNLOADED) {
                        resolve(file);
                    } else if (file.dl_status === File.DOWNLOADING_STATUS_FAILED) {
                        reject('ArweaveStorage: File '+id+' could not be downloaded: dl_status==DOWNLOADING_STATUS_FAILED'); // todo: sanitize
                    } else {
                        waitUntilRetrieval(resolve, reject);
                    }
                } catch(e) {
                    reject(e);
                }
            }, 100); // todo: change interval? // todo: make it event-based rather than have thousands of callbacks waiting every 100ms
        };

        return new Promise(waitUntilRetrieval);
    }

    async readFile(id, encoding = null) {
        if (!id) throw new Error('undefined or null id passed to storage.readFile');
        id = id.replace('0x', '').toLowerCase();
        // const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        // utils.makeSurePathExists(cache_dir);
        // const tmpFileName = path.join(cache_dir, 'file_' + id);
        const file = await this.getFile(id);
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
                this.chunkUploadingTick(chunk);
            });
        }
    }

    async chooseProviderCandidate(recursive = true) {
        try {
            // todo: t.LOCK.UPDATE doesn't work on empty rows!!! use findOrCreate with locking
            const provider = await Model.transaction(async(t) => {
                const storageProviders = await this.ctx.web3bridge.getAllStorageProviders();
                const randomProvider = storageProviders[storageProviders.length * Math.random() | 0];
                const getProviderDetails = await this.ctx.web3bridge.getSingleProvider(randomProvider);
                const id = getProviderDetails['0'];
                let provider, isNew;
                let existingProviders = await Provider.findAll({
                    where: { id: id },
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                    limit: 1,
                });

                if (existingProviders.length > 0) {
                    provider = existingProviders[0];
                    isNew = false;
                    // todo: what if connectionstring changed on blockchain?
                } else {
                    provider = await Provider.create({
                        id: id,
                        address: ('0x' + id.split('#').pop()).slice(-42),
                        connection: id,
                    }, { transaction: t });
                    isNew = true;
                }

                return provider;

                // todo: remove blacklist from options
                // todo: remove those already in progress or failed in this chunk
            });

            return provider;

        } catch (e) {
            // Something went wrong. Maybe we ran into a race condition and the key was just now generated?
            // Try again but throw an error if it fails again
            if (recursive) {
                return this.chooseProviderCandidate(false);
            } else {
                throw e;
            }
        }
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
        return this.utils.urlToContact( await this.chooseProviderCandidate() );
        // return 'http://127.0.0.1:12345/#989695771d51de19e9ccb943d32e58f872267fcc'; // test1 // TODO!
    }

    async downloadChunk(chunk) {
        // todo todo todo: make it in the same way as chunkUploadingTick - ??

        this.log.debug({id: chunk.id}, 'chunkDownloadingTick');

        if (chunk.dl_status !== Chunk.DOWNLOADING_STATUS_READY_TO_DOWNLOAD) return;

        chunk.dl_status = Chunk.DOWNLOADING_STATUS_DOWNLOADING;
        await chunk.save();

        // let provider = await this.chooseProviderCandidate(); // todo: what if no candidates available? this case should be processed

        const query = gql`
                            {
                                transactions(
                                    tags: [
                                        {
                                            name: "${this.__PN_TAG_VERSIONED_CHUNK_ID_KEY}",
                                            values: ["${chunk.id}"]
                                        }
                                    ]
                                ) {
                                    edges {
                                        node {
                                            id
                                            tags {
                                                name
                                                value
                                            }
                                        }
                                    }
                                }
                            }
        `;
        const tabs = Math.floor(Math.random() * (Math.ceil(20) - Math.floor(0) + 1) + 0);
        const ARW_LOG = ' '.repeat(tabs) + 'ARW_LOG ';
        let ARW_LOG_TIME = Date.now();
        const ARW_LOG_START = Date.now();
        let elapsed = () => {
            let now = Date.now();
            let ret = ' elapsed from prev: '+((now - ARW_LOG_TIME) / 1000)+', from start: '+((now - ARW_LOG_START) / 1000);
            ARW_LOG_TIME = now;
            return ret;
        };

        this.log.debug({chunk: chunk.id}, 'ARW_LOG arweave/graphql');

        const queryResult = await request('https://arweave.net/graphql', query);

        this.log.debug({chunk: chunk.id, elapsed: elapsed(), query, queryResult}, 'ARW_LOG arweave/graphql - DONE');

        for(let edge of queryResult.transactions.edges) {
            const txid = edge.node.id;

            // Get the data decoded to a Uint8Array for binary data
            console.log(ARW_LOG + '  downloading getData from arweave', chunk.id, {txid}, elapsed());
            try {
                const data = await this.arweave.transactions.getData(txid, {decode: true}); //.then(data => {     // Uint8Array [10, 60, 33, 68, ...]

                // Read back data
                // Don't use arweave.transactions.getData, data is not available instantly via
                // that API (it results in a TX_PENDING error). Here's the explanation from Discord:
                //
                // but essentially if /{txid} returns 202
                // it's "pending"
                // which with regular txs is true
                // but it also returns 202 for unseeded Bundlr txs
                // so the data exists in Bundlr - but not on L1 (Arweave)

                // const dl_url = `https://arweave.net/${txid}`;
                // const result = await axios.get();
                // this.log.debug({dl_url, result});
                // const data = result.data;

                this.log.debug({chunk: chunk.id, elapsed: elapsed()}, 'ARW_LOG downloading getData from arweave - DONE');

                const buf = Buffer.from(data);

                if (utils.hashFnHex(buf) === chunk.id) {
                    this.log.debug({chunk: chunk.id, elapsed: elapsed(), txid}, 'ARW_LOG WORKED!');
                    if (!Buffer.isBuffer(buf)) throw Error('Error: chunkDownloadingTick GET_DECRYPTED_CHUNK response: data must be a Buffer');
                    chunk.setData(buf); // todo: what if it errors out?
                    chunk.dl_status = Chunk.DOWNLOADING_STATUS_DOWNLOADED;
                    await chunk.save();
                    await chunk.reconsiderDownloadingStatus();

                    return;
                }

                this.log.debug({chunk: chunk.id, hash: utils.hashFnHex(buf), txid}, 'ARW_LOG NOT WORKED! WRONG CHUNK');
            } catch (e) {
                this.log.error({chunk: chunk.id, txid}, 'ARW_LOG NOT WORKED! FAILED TO GET DATA!');
            }
        }

        chunk.dl_status = Chunk.DOWNLOADING_STATUS_FAILED;
        await chunk.save();
        await chunk.reconsiderDownloadingStatus();
    }

    async SEND_STORE_CHUNK_REQUEST(chunk, link) {
        return new Promise((resolve, reject) => {
            const provider_id = link.provider_id;
            if (!provider_id) {
                const msg = 'Unable to identify provider';
                this.log.error({chunkId: chunk.id, link: link.id}, msg);
                throw new Error(msg);
            }
            this.send('STORE_CHUNK_REQUEST', [chunk.id, chunk.getSize(), chunk.expires], link.provider_id, async(err, result) => {
                await link.refresh();
                (!err) ? resolve(true) : reject(err); // machine will move to next state
            });
        });
    }

    async SEND_STORE_CHUNK_SEGMENTS(link, chunk) {
        let rawData = chunk.getData();

        if (this.config.arweave_use_real_wallet) {
            // Real "AR" mode
            let transaction = await this.arweave.createTransaction({ data: rawData }, this.getArweaveKey());

            // transaction.addTag('keccak256hex', hash);
            // transaction.addTag('pn_experiment', '1');
            transaction.addTag(this.__PN_TAG_VERSION_MAJOR_KEY, this.__PN_TAG_VERSION_MAJOR_VALUE);
            transaction.addTag(this.__PN_TAG_VERSION_MINOR_KEY, this.__PN_TAG_VERSION_MINOR_VALUE);
            transaction.addTag(this.__PN_TAG_CHUNK_ID_KEY, chunk.id);
            transaction.addTag(this.__PN_TAG_VERSIONED_CHUNK_ID_KEY, chunk.id);

            // Sign
            await this.arweave.transactions.sign(transaction, this.getArweaveKey());

            // Upload
            let uploader = await this.arweave.transactions.getUploader(transaction);
            while (!uploader.isComplete) {
                await uploader.uploadChunk();
                // this.log.debug(`${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`);
            }

            // return new Promise(async(resolve, reject) => {
            //     this.send('STORE_CHUNK_SEGMENTS', data, link.provider_id, async (err, result) => {
            //         await link.refresh();
            //         (!err) ? resolve(true) : reject(err); // machine will move to next state
            //     });
            // });
        } else {
            // Use bundler - no
            // Use signer

            const tags = {
                [this.__PN_TAG_VERSION_MAJOR_KEY]: this.__PN_TAG_VERSION_MAJOR_VALUE,
                [this.__PN_TAG_VERSION_MINOR_KEY]: this.__PN_TAG_VERSION_MINOR_VALUE,
                [this.__PN_TAG_CHUNK_ID_KEY]: chunk.id,
                [this.__PN_TAG_VERSIONED_CHUNK_ID_KEY]: chunk.id
            };

            this.log.debug({
                arweave_airdrop_endpoint: this.config.arweave_airdrop_endpoint,
                chunkId: chunk.id
            }, 'Signing the chunk of data');

            const FormData = require('form-data'); // npm install --save form-data

            const form = new FormData();
            form.append('file', fs.createReadStream(Chunk.getChunkStoragePath(chunk.id)));

            for(let k in tags) {
                let v = tags[k];
                form.append(k, v);
            }

            const request_config = {
                headers: {
                    // 'Authorization': `Bearer ${access_token}`,
                    ...form.getHeaders()
                }
            };

            const response = await axios.post(this.config.arweave_airdrop_endpoint + '/signPOST', form, request_config);

            // const response = await axios.post(this.config.arweave_airdrop_endpoint + 'sign', {
            //     data: rawData.toString(),
            //     tags,
            // });
            if (response.data.status !== 'ok') {
                throw Error('Arweave airdrop endpoint return error: '+JSON.stringify(response));
            } else {
                this.log.debug({chunkId: chunk.id, txid: response.data.txid}, 'Chunk is uploaded');
            }

            return;

            // const key = this.getArweaveKey();
            // const signer = new ArweaveSigner(key);
            // const item = createData(rawData, signer);
            // await item.sign(signer);
            // // This transaction ID is guaranteed to be usable
            // const txid = item.id;
            // const response = await item.sendToBundler(this.BUNDLER_URL);
        }
    }

    async SEND_STORE_CHUNK_DATA(data, link) {
        return new Promise((resolve, reject) => {
            this.send('STORE_CHUNK_DATA', data, link.provider_id, async (err, result) => {
                await link.refresh();
                let idx = data[1];
                const totalSegments = link.segment_hashes.length;
                if (!err) {
                    // todo: use the clues server gives you about which segments it already received (helps in case of duplication?)

                    // Mark this segment as received, because the provider node just acknowledged it
                    if (!link.segments_received) link.segments_received = [];
                    link.segments_received = _.uniq([...link.segments_received, idx]);
                    await link.save();

                    // If everything is received, then we are done
                    if (Object.keys(link.segments_received).length >= totalSegments) {
                        link.segments_received = null;
                        link.segments_sent = null;
                        await link.save();
                        return resolve(true);
                    }
                    return resolve(false); // not done yet
                } else {
                    this.log.error({error: err, stack: err.stack}, 'SEND_STORE_CHUNK_DATA error'); // todo: remove
                    return reject(err);
                }
            });
        });
    }

    async SEND_STORE_CHUNK_SIGNATURE_REQUEST(link) {
        return new Promise((resolve, reject) => {
            this.send('STORE_CHUNK_SIGNATURE_REQUEST', [link.merkle_root], link.provider_id, async (err, result) => {
                await link.refresh();
                try {
                    if (err) return reject('Provider responded with: ' + err); // todo
                    if (!result) return reject('STORE_CHUNK_SIGNATURE_REQUEST: Result is empty!'); // todo

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
                    // if (this.ctx.config.payments.enabled) {
                    //     const provider = await link.provider;
                    //     const checksumAddress = await this.ctx.web3bridge.toChecksumAddress(`0x${provider.id.split('#')[1]}`);
                    //     await makePayment(checksumAddress, 10); // todo: calculate amount using cost per kb for service provider
                    // }
                    // const chunk = await link.getChunk();
                    // await chunk.reconsiderUploadingStatus(true); <-- already being done after this function is over, if all is good, remove this block

                    return resolve(true);
                } catch (e) {
                    // todo: don't just put this into the console, this is for debugging purposes
                    this.log.error({error: e.message, stack: e.stack, result}, 'Store chunk request has failed');
                    return reject(e);
                }
            });
        });
    }

    // todo: move to client/storage
    async chunkUploadingTick(chunk) {
        this.log.debug({chunk: chunk.id, status: this.uploadingChunksProcessing[chunk.id]}, 'Chunk uploading tick start');

        if (this.uploadingChunksProcessing[chunk.id]) return;
        this.uploadingChunksProcessing[chunk.id] = true;

        await chunk.refresh();
        if (chunk.ul_status !== Chunk.UPLOADING_STATUS_UPLOADING) return;

        // Remove candidates that didn't respond within timeout period
        // todo

        // Push some candidates if not enough
        const all = await chunk.getLinksWithStatus( StorageLink.STATUS_ALL );
        const candidates = await chunk.getLinksWithStatus( StorageLink.STATUS_CREATED );
        const failed = await chunk.getLinksWithStatus( StorageLink.STATUS_FAILED );
        const inProgressOrLiveCount = all.length - failed.length;
        const candidatesRequiredCount = chunk.redundancy - inProgressOrLiveCount;
        const additionalCandidatesRequired = candidatesRequiredCount - candidates.length;

        this.log.debug({
            id: chunk.id,
            all,
            candidates,
            failed,
            inProgressOrLiveCount,
            candidatesRequiredCount,
            additionalCandidatesRequired}, 'Chunk uploading tick after refresh'); // todo: remove

        if (failed.length > 0) {
            // for some reason this block of code doesn't get used anyway until the next simulation tick, we fail the file long before in the machine
            /// TODO: This is only specific to arweave! If one link failed, fail the whole chunk upload
            chunk.ul_status = Chunk.UPLOADING_STATUS_FAILED;
            await chunk.save();
            const files = await File.getAllContainingChunkId(chunk.id);
            for(let file of files) {
                // todo: normally you would do it through another tick but we'll just fail the whole file
                file.ul_status = File.UPLOADING_STATUS_FAILED;
                await file.save();
            }
            return;
        } else {
            if (additionalCandidatesRequired > 0) {
                // for(let i=0; i < additionalCandidatesRequired; i++) { // todo when you implement real provider choice & sort out the situation when no candidates available
                let link = StorageLink.build();
                // let provider = await this.chooseProviderCandidate(); // todo: what if no candidates available? this case should be processed // todo optimize: maybe only supply id
                // link.id = DB.generateRandomIdForNewRecord();
                // link.provider_id = provider.id;
                // link.redkey_id = await this.getOrGenerateRedkeyId(provider);
                link.chunk_id = chunk.id;
                link.initStateMachine(chunk, this.config.engine);
                // use storage link state machine to sent CREATE event
                link.machine.send('CREATE');
            }
        }

        for(let link of all) {
            const requests_length = (this.current_requests[link.provider_id]) ? this.current_requests[link.provider_id].length : 0;
            const queued_length = (this.queued_requests[link.provider_id]) ? this.queued_requests[link.provider_id].length : 0;
            this.log.debug({
                chunkId: chunk.id,
                linkId: link.id,
                linkSegmentsReceived: link.segments_received,
                linkStatus: link.status,
                lingSegmentsSent: Object.keys(link.segments_sent ? link.segments_sent : {}).map(Number),
                lingError: link.error || '',
                requests_length,
                queued_length}, 'StorageLink status');
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
            return this.ctx.network.kademlia.node.send(req.cmd, req.data, utils.urlToContact(contact), (err, result) => {
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

    async getOrGenerateRedkeyId(provider, recursive = true) {
        // Note: locking here is important because of concurrency issues. I've spent hours debugging random errors in
        // encryption when it turned out that several keys were generated for the same provider at once and they were
        // all mixed up when they were actually sent to the service provider, which made for invalid decryption

        try {
            const redkey = await Model.transaction(async(t) => { // todo: t.LOCK.UPDATE doesn't work on empty rows!!! use findOrCreate with locking
                let existingProviderKeys = await Redkey.findAll({
                    where: { provider_id: provider.id },
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                    limit: 1,
                });

                if (existingProviderKeys.length > 0) return existingProviderKeys[0];

                const keyIndex = 0;

                // If no keys, generate one
                let { privateKey, publicKey } = await Redkey.generateNewForProvider(provider, keyIndex);

                return await Redkey.create({
                    public_key: publicKey,
                    private_key: privateKey,
                    provider_id: provider.id,
                    index: keyIndex,
                }, { transaction: t });
            });

            return redkey.id;

        } catch(e) {
            // Something went wrong. Maybe we ran into a race condition and the key was just now generated?
            // Try again but throw an error if it fails again
            if (recursive) {
                return this.getOrGenerateRedkeyId(provider, false);
            } else {
                throw e;
            }
        }

        // todo: multiple?
    }

    getCacheDir() {
        const cache_dir = path.join(this.ctx.datadir, this.config.cache_path);
        utils.makeSurePathExists(cache_dir);
        return cache_dir;
    }
}

module.exports = StorageArweave;

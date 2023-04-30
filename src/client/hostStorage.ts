// let tracker = new (require('./src/client/hostStorage').HostStorageTracker)({});
// let hostStorageGet = require('./src/client/hostStorage').hostStorageGet;

import {
    downloadAndDecryptFile,
    encryptDataSymmetric,
    EncryptedFile
} from './encryption';
const blockchain = require('../network/providers/ethereum.js');
import {getIdentity} from '../name_service/identity';
import {uploadData} from './storage';
import path from 'path';
import {DATADIR} from './storage/config.js';

const HOST_STORAGE_VERSION = '0.1';
const HOST_STORAGE_IKV_KEY = `::hostStorage_v${HOST_STORAGE_VERSION}`;
const HOST_STORAGE_ROOT_FILE_PATH = path.join(DATADIR, `hostStorageRoot_v${HOST_STORAGE_VERSION}.id`);
const ROOT_ENC_KEY_PATH = 'hostStorage';

import logger from '../core/log.js';
const log = logger.child({module: 'hostStorage'});

import {getNetworkPrivateSubKey} from '../wallet/keystore.js';
import fs from 'fs-extra';
import {isValidStorageId} from '../util/index.js';
import Queue from '../util/queue';
import {DisplayableError} from '../core/exceptions';

type AnyValueType = string|number|object|boolean|null|Buffer|undefined;

interface ObjectWithAnyValues {
    [key: string]: AnyValueType;
}

const _getRootEncKey = (): Buffer => {
    if (rootEncKey === null) {
        rootEncKey = Buffer.from(getNetworkPrivateSubKey(ROOT_ENC_KEY_PATH), 'hex');
    }

    return Buffer.from(rootEncKey);
};

export enum MODIFY_TYPE {
    SET = 'set',
    UNSET = 'unset',
    APPEND = 'append',
    REMOVE_AT = 'removeAt',
    INSERT_AT = 'insertAt',
    REPLACE_AT = 'replaceAt',
}

let root: HostStorageTracker|null = null;
let rootEncKey: Buffer|null = null;
let _identity: string|null = null;

const _getMyIdentity = async () => {
    if (_identity === null) {
        _identity = (await getIdentity()).identity;
    }
    return _identity;
};

enum TrackerItemType {
    encstring = 'S',
    encobject = 'O',
    encarray = 'A',
    encbuffer = 'B',
    literal = 'L',
}

type HostStorageTrackerItem = {
    t: TrackerItemType;
    v: AnyValueType;
}

export class HostStorageTracker {
    items: Record<string, HostStorageTrackerItem> = {};
    pending: Record<string, boolean> = {};
    encFile: EncryptedFile|null = null;

    constructor(obj: Record<string, HostStorageTrackerItem>) {
        this.items = obj;
    }

    async serialize(): Promise<string> {
        // iterate over all items, but replace any encrypted items with their descriptions
        const result: Record<string, unknown> = {};

        for (const k in this.items) {
            const item = this.items[k];
            if (item.v instanceof EncryptedFile) {
                result[k] = {
                    t: item.t,
                    v: [item.v.key.toString('hex'), item.v.fileId]
                };
            } else if ((item.t === TrackerItemType.encobject || item.t === TrackerItemType.encarray)
                && item.v instanceof HostStorageTracker) {
                // make sure it's uploaded
                if (item.v.encFile === null) {
                    await item.v.upload();
                }

                result[k] = {
                    t: item.t,
                    v: [item.v.encFile!.key.toString('hex'), item.v.encFile!.fileId]
                };
            } else {
                result[k] = item;
            }
        }

        return JSON.stringify(result);
    }

    async upload(forceEncryptionKey: Buffer|null = null): Promise<void> {
        const encryptedData = await encryptDataSymmetric(Buffer.from(await this.serialize()), forceEncryptionKey);
        const fileId = await uploadData(encryptedData.encryptedMaterial, false);
        this.encFile = new EncryptedFile(encryptedData.key, fileId);
    }

    static async fromDownload(encryptedFile: EncryptedFile): Promise<HostStorageTracker> {
        const data = await downloadAndDecryptFile(encryptedFile);
        const obj = JSON.parse(data.toString('utf8'));
        const tracker = new HostStorageTracker(obj);
        tracker.encFile = encryptedFile;
        return tracker;
    }

    async _sub(path: Array<string|number>):
        Promise<[sub: HostStorageTrackerItem, k: string|number, theRest: Array<string|number>]> {
        // Make sure path is an Array
        if (!Array.isArray(path) || typeof path !== 'object') {
            throw new DisplayableError('_sub: Path must be an array');
        }

        const k = path[0];
        const theRest = path.slice(1);

        if (typeof k === 'undefined') {
            throw new DisplayableError('Invalid path');
        }
        if (k === null || typeof k === 'string' || typeof k === 'number') {
            // valid
        } else {
            throw new DisplayableError('Invalid path');
        }

        const item = this.items[k];

        // Does it exist?
        if (item === undefined) {
            // All good, we'll create it
        } else {
            // Load if needed
            switch (item.t) {
                case TrackerItemType.encobject:
                case TrackerItemType.encarray:
                    if (!(item.v instanceof HostStorageTracker)) {
                        // if isArray
                        if (Array.isArray(item.v)) {
                            const [key, fileId] = item.v;
                            item.v = await HostStorageTracker.fromDownload(new EncryptedFile(Buffer.from(key, 'hex'), fileId));
                        } else {
                            throw new DisplayableError('Invalid path data');
                        }
                    }
                    break;
                case TrackerItemType.encstring:
                case TrackerItemType.encbuffer:
                    if (!(item.v instanceof EncryptedFile)) {
                        const [key, fileId] = item.v as [string, string];
                        item.v = new EncryptedFile(Buffer.from(key, 'hex'), fileId);
                    }
                    break;
            }
        }

        return [item, k, theRest];
    }

    async get(path: Array<string|number>): Promise<AnyValueType> {
        const [sub, k, theRest] = await this._sub(path);

        // Does it exist?
        if (sub === undefined) {
            // throw new DisplayableError('Path does not exist');
            return undefined;
        }

        if (theRest.length !== 0) {
            const subV = sub.v;
            if (subV instanceof HostStorageTracker) {
                return await subV.get(theRest);
            } else {
                throw new DisplayableError('Invalid path value');
            }
        } else {
            return await this.toLiteral(k);
        }
    }

    async dir(path: Array<string|number>): Promise<AnyValueType> {
        const [sub, k, theRest] = await this._sub(path);
        void k; // make linter shut up

        // Does it exist?
        if (sub === undefined) {
            // throw new DisplayableError('Path does not exist');
            return undefined;
        }

        // Make sure sub.v is a HostStorageTracker
        if (!(sub.v instanceof HostStorageTracker)) {
            throw new DisplayableError('Invalid path value: not a HostStorageTracker');
        }

        if (theRest.length !== 0) {
            return await sub.v.dir(theRest);
        } else {
            return Object.keys(sub.v.items);
        }
    }

    async set(path: Array<string|number>, v: AnyValueType): Promise<void> {
        const [sub, k, theRest] = await this._sub(path);

        if (theRest.length !== 0) {
            const item = this.items[k];

            // Check item.v is defined
            if (item.v === undefined) {
                throw new DisplayableError('Invalid path data in set');
            }

            if (sub === undefined) {
                // Create it
                const isArray = (typeof theRest[0] === 'number');
                this.items[k] = {
                    t: (isArray) ? TrackerItemType.encarray : TrackerItemType.encobject,
                    v: new HostStorageTracker({})
                };
            }

            // make sure item.v is a HostStorageTracker
            if (!(item.v instanceof HostStorageTracker)) {
                throw new DisplayableError('Invalid path data in set: item.v is not a HostStorageTracker');
            }

            await item.v.set(theRest, v);
            this.pending[k] = true;
        } else {
            switch (typeof v) {
                case 'string':
                    const encryptedData = await encryptDataSymmetric(Buffer.from(v));
                    const fileId = await uploadData(encryptedData.encryptedMaterial, false);
                    this.items[k] = {
                        t: TrackerItemType.encstring,
                        v: new EncryptedFile(encryptedData.key, fileId)
                    };
                    this.pending[k] = true;
                    break;
                case 'number':
                case 'boolean':
                case 'undefined':
                    this.items[k] = {
                        t: TrackerItemType.literal,
                        v: v
                    };
                    break;
                case 'object':
                    if (v === null) {
                        this.items[k] = {
                            t: TrackerItemType.literal,
                            v: v
                        };
                    } else if (Object.keys(v).length === 0) {
                        this.items[k] = {
                            t: TrackerItemType.literal,
                            v: v
                        };
                    } else if (Buffer.isBuffer(v)) {
                        const encryptedData = await encryptDataSymmetric(v);
                        const fileId = await uploadData(encryptedData.encryptedMaterial, false);
                        this.items[k] = {
                            t: TrackerItemType.encbuffer,
                            v: new EncryptedFile(encryptedData.key, fileId)
                        };
                        this.pending[k] = true;
                    } else {
                        const tracker = new HostStorageTracker({});
                        for (const k in v as ObjectWithAnyValues) {
                            await tracker.set([k], (v as ObjectWithAnyValues)[k]);
                        }
                        await tracker.upload();
                        this.items[k] = {
                            t: TrackerItemType.encobject,
                            v: tracker
                        };
                        this.pending[k] = true;
                    }

                    break;
                default:
                    throw new DisplayableError('Invalid type');
            }
        }

        await this.upload();
    }

    async len(path: Array<string|number>): Promise<number|undefined> {
        const [sub, k, theRest] = await this._sub(path);
        void k; // make linter shut up

        // Does it exist?
        if (sub === undefined) {
            // throw new DisplayableError('Path does not exist');
            return 0;
        }

        if (theRest.length !== 0) {
            const subV = sub.v;
            if (!(subV instanceof HostStorageTracker)) {
                throw new DisplayableError('Invalid path value');
            }
            return await subV.len(theRest);
        } else {
            const subV = sub.v;
            switch (sub.t) {
                case TrackerItemType.encarray:
                    if (!(subV instanceof HostStorageTracker)) {
                        throw new DisplayableError('Invalid path value');
                    }
                    return Object.keys(subV.items).length;
                case TrackerItemType.encobject:
                    if (!(subV instanceof HostStorageTracker)) {
                        throw new DisplayableError('Invalid path value');
                    }
                    return Object.keys(subV.items).length;
                case TrackerItemType.literal:
                    if (Array.isArray(subV)) {
                        return subV.length;
                    } else {
                        throw new DisplayableError('Invalid type for len');
                    }
                default:
                    throw new DisplayableError('Invalid tracker item type for len: ' + sub.t);
            }
        }
    }

    async unset(path: Array<string|number>): Promise<void> {
        const [sub, k, theRest] = await this._sub(path);

        const subV = sub.v;

        if (theRest.length !== 0) {
            if (!(subV instanceof HostStorageTracker)) {
                throw new DisplayableError('Invalid path value');
            }
            await subV.unset(theRest);
            this.pending[k] = true;
        } else {
            this.items[k] = {
                t: TrackerItemType.literal,
                v: undefined
            };
            this.pending[k] = true;
        }

        await this.upload();
    }

    async append(path: Array<string|number>, v: AnyValueType): Promise<void> {
        const [sub, k, theRest] = await this._sub(path);

        if (theRest.length !== 0) {
            const subV = sub.v;
            if (!(subV instanceof HostStorageTracker)) {
                throw new DisplayableError('Invalid path value');
            }
            await subV.append(theRest, v);
            this.pending[k] = true;
        } else {
            this.items[k] = {
                t: TrackerItemType.encarray,
                v: await this._newEncArray(k, v, () => {}, undefined)
            };
            this.pending[k] = true;
        }

        await this.upload();
    }

    async _newEncArray(k: string|number, append: AnyValueType, filter: CallableFunction, insertIndex: number|undefined): Promise<HostStorageTracker> {
        if (typeof insertIndex === 'undefined') {
            insertIndex = (await this.len([k])) || 0;
        }

        switch (this.items[k].t) {
            case TrackerItemType.literal:
                if (this.items[k].v === undefined || Array.isArray(this.items[k].v)) {
                    // turn into tracker with one item
                    const tracker = new HostStorageTracker({});
                    await tracker.set([0], this.items[k].v);
                    await tracker.upload();
                    return tracker;
                } else {
                    throw new DisplayableError('Invalid type for append');
                }
                break;
            case TrackerItemType.encarray:
                const result = [];

                const itemV = this.items[k].v;

                if (!Array.isArray(itemV)) {
                    throw new DisplayableError('Invalid type for append, doesnt match');
                }

                for (const idx in itemV) {
                    const idxNum = parseInt(idx);
                    const passed = await filter(idx);
                    if (! passed) {
                        continue;
                    }
                    result.push(await this.items[k].v);

                    if (insertIndex === idxNum) {
                        result.push(null);
                    }
                }
                const tracker = new HostStorageTracker({});

                for (const idx in result) {
                    const idxNum = parseInt(idx);
                    await tracker.set([idxNum], result[idx]);
                }

                if (append !== undefined) {
                    if (insertIndex === result.length) {
                        await tracker.set([result.length], append);
                    } else {
                        await tracker.set([insertIndex], append);
                    }
                }
                await tracker.upload();
                return tracker;
            default:
                throw new DisplayableError('Invalid tracker item type for append');
        }
    }

    async insertAt(path: Array<string|number>, v: AnyValueType, index: number): Promise<void> {
        const [sub, k, theRest] = await this._sub(path);

        if (theRest.length !== 0) {
            const subV = sub.v;
            if (!(subV instanceof HostStorageTracker)) {
                throw new DisplayableError('Invalid path value');
            }
            await subV.append(theRest, v);
            this.pending[k] = true;
        } else {
            this.items[k] = {
                t: TrackerItemType.encarray,
                v: await this._newEncArray(k, v, (k:AnyValueType) => k !== index, index)
            };
            this.pending[k] = true;
        }

        await this.upload();
    }

    async removeAt(path: Array<string|number>, index: number): Promise<void> {
        const [sub, k, theRest] = await this._sub(path);

        if (theRest.length !== 0) {
            const subV = sub.v;
            if (!(subV instanceof HostStorageTracker)) {
                throw new DisplayableError('Invalid path value');
            }
            await subV.removeAt(theRest, index);
            this.pending[k] = true;
        } else {
            this.items[k] = {
                t: TrackerItemType.encarray,
                v: await this._newEncArray(k, undefined, (k:AnyValueType) => k !== index, undefined)
            };
            this.pending[k] = true;
        }

        await this.upload();
    }

    async replaceAt(path: Array<string|number>, v: AnyValueType, index: number): Promise<void> {
        const [sub, k, theRest] = await this._sub(path);

        const subV = sub.v;
        if (!(subV instanceof HostStorageTracker)) {
            throw new DisplayableError('Invalid path value');
        }

        if (theRest.length !== 0) {
            await subV.replaceAt(theRest, v, index);
            this.pending[k] = true;
        } else {
            await subV.set([index], v);
            this.pending[k] = true;
        }

        await this.upload();
    }

    async toLiteral(k: string|number): Promise<AnyValueType> {
        // Does it exist?
        if (this.items[k] === undefined) {
            return undefined;
        }

        const item = this.items[k];

        switch (item.t) {
            case TrackerItemType.encstring:
            case TrackerItemType.encbuffer:
                if (!(item.v instanceof EncryptedFile)) {
                    if (!Array.isArray(item.v)) {
                        throw new DisplayableError('Invalid tracker item source type');
                    }
                    item.v = new EncryptedFile(Buffer.from(item.v[0], 'hex'), item.v[1]);
                }

                if (!(item.v instanceof EncryptedFile)) {
                    throw new DisplayableError('Invalid tracker item source type');
                }

                if (item.t === TrackerItemType.encstring) {
                    return (await downloadAndDecryptFile(item.v)).toString();
                } else {
                    return await downloadAndDecryptFile(item.v);
                }
            case TrackerItemType.encobject:
            case TrackerItemType.encarray:
                if (!(item.v instanceof HostStorageTracker)) {
                    throw new DisplayableError('Invalid tracker item source type');
                }

                return await item.v.toObject();
            case TrackerItemType.literal:
                return item.v;
            default:
                throw new DisplayableError('Invalid tracker item type');
        }
    }

    async toObject(): Promise<AnyValueType> {
        const result: ObjectWithAnyValues = {};

        for (const k of Object.keys(this.items)) {
            result[k] = await this.get([k]);
        }

        return result;
    }
}

const _getRoot = async(): Promise<HostStorageTracker> => {
    if (root === null || true) {
        let fileId = null;

        // try to load locally first
        let localFileId;
        try {
            localFileId = fs.readFileSync(HOST_STORAGE_ROOT_FILE_PATH, 'utf8');
        } catch (e) {
            localFileId = '';
        }

        // remote
        const myIdentity = await _getMyIdentity();
        const remoteFileID = await blockchain.getKeyValue(myIdentity, HOST_STORAGE_IKV_KEY, 'latest');

        if (localFileId && remoteFileID) {
            // conflict
            // throw new DisplayableError('Host storage conflict'); // todo
            if (localFileId === remoteFileID) {
                log.debug({localFileId, remoteFileID}, 'Host storage: everything synced');
            } else {
                log.debug({localFileId, remoteFileID}, 'Host storage: id conflict, but we load local'); // todo
            }
            fileId = localFileId;
        } else if (localFileId && isValidStorageId(localFileId)) {
            fileId = localFileId;
            log.debug({localFileId}, 'Host storage: loading local');
        } else if (remoteFileID && isValidStorageId(remoteFileID)) {
            fileId = remoteFileID;
            log.debug({localFileId}, 'Host storage: loading remote');
        } else {
            // nothing came up
            fileId = null;
        }

        if (fileId) {
            try {
                root = await HostStorageTracker.fromDownload(new EncryptedFile(_getRootEncKey(), fileId));
                log.debug({fileId}, 'Host storage root loaded');
            } catch (e) {
                // something went wrong, but we can't do anything about it
                // create a new one
                root = new HostStorageTracker({});

                log.error({fileId, err: e}, 'Error decrypting host storage. Loading empty root.');
            }
        } else {
            root = new HostStorageTracker({});
            log.debug({fileId}, 'Host storage root loaded');
        }
    }

    return root;
};

let sequentialInProgress = false;
const sequentialCallbacks: Queue<AnyValueType> = new Queue();
const ensureSequential = async<T>(fn: () => Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    // add to queue
    sequentialCallbacks.enqueue(async() => {
        try {
            const result = await fn();
            resolve(result);
        } catch (e) {
            reject(e);
        }
    });

    // poke the queue
    _processSequential();
});
const _processSequential = async() => {
    if (sequentialInProgress) {
        return;
    }

    sequentialInProgress = true;

    if (! sequentialCallbacks.isEmpty()) {
        const fn = sequentialCallbacks.dequeue();

        await fn();

        setImmediate(_processSequential);
    }

    sequentialInProgress = false;
};

const _prependPath = (prepend: Array<string|number>, path: Array<string|number>) => {
    // Make sure path is an array
    if (! Array.isArray(path)) {
        throw new DisplayableError('_prependPath: Path must be an array');
    }

    return [...prepend, ...path];
};

export const hostStorageGet = async(host: string, path: Array<string|number>): Promise<AnyValueType> => ensureSequential(async() => {
    const root = await _getRoot();

    // console.log('root', root);
    // console.log('root.get', await root.get(['aitest.sergedeployer.local']));

    return await root.get(_prependPath([host], path));
});

export const hostStorageDir = async(host: string, path: Array<string|number>): Promise<AnyValueType> => ensureSequential(async() => {
    const root = await _getRoot();

    return await root.dir(_prependPath([host], path));
});

export const hostStorageLen = async(host: string, path: Array<string|number>): Promise<AnyValueType> => ensureSequential(async() => {
    const root = await _getRoot();

    return await root.len(_prependPath([host], path));
});

export const hostStorageModify = async(host: string, path: Array<string|number>, value: AnyValueType, type: MODIFY_TYPE, index: number|null = null) => ensureSequential(async() => {
    // get current object
    const root = await _getRoot();

    // Make sure value is defined
    function makeSureValueDefined(v: AnyValueType) {
        if (v === undefined) {
            throw new DisplayableError('Value must be defined');
        }
    }

    const fullPath = _prependPath([host], path);

    // set the value
    switch (type) {
        case MODIFY_TYPE.SET:
            makeSureValueDefined(value);
            await root.set(fullPath, value);
            break;
        case MODIFY_TYPE.UNSET:
            await root.unset(fullPath);
            break;
        case MODIFY_TYPE.APPEND:
            await root.append(fullPath, value);
            break;
        case MODIFY_TYPE.INSERT_AT:
            if (index === null) throw new DisplayableError('Index must be specified for insert_at');
            makeSureValueDefined(value);
            await root.insertAt(fullPath, value, index);
            break;
        case MODIFY_TYPE.REMOVE_AT:
            if (index === null) throw new DisplayableError('Index must be specified for remove_at');
            await root.removeAt(fullPath, index);
            break;
        case MODIFY_TYPE.REPLACE_AT:
            if (index === null) throw new DisplayableError('Index must be specified for replace_at');
            makeSureValueDefined(value);
            await root.replaceAt(fullPath, value, index);
            break;
        default:
            throw new DisplayableError('Unknown modify type');
    }

    // upload the root
    await root.upload(_getRootEncKey());

    const newRootFileId = root.encFile?.fileId || '';

    // change the root locally
    fs.writeFileSync(HOST_STORAGE_ROOT_FILE_PATH, newRootFileId, 'utf8');

    // schedule to sync
    syncHostStorage();

    // console.log(root);
    // console.log(await root.get([host]));
});

let syncing = false;
let syncAgain = false;
let lastSync = 0;
const SYNC_INTERVAL = 1000 * 10; // not more than once every 10 seconds

const syncHostStorage = async() => {
    if (syncing) {
        syncAgain = true;
        return;
    }

    if (lastSync + SYNC_INTERVAL > Date.now()) {
        // reschedule
        setTimeout(syncHostStorage, SYNC_INTERVAL - (Date.now() - lastSync));
        return;
    }

    syncing = true;
    syncAgain = false;
    lastSync = Date.now();

    try {
        const root = await _getRoot();

        const newRootFileId = root.encFile?.fileId || '';

        // send ikv change
        const myIdentity = await _getMyIdentity();
        await blockchain.putKeyValue(myIdentity, HOST_STORAGE_IKV_KEY, newRootFileId, 'latest');

        syncing = false;
    } catch (e) {
        syncing = false;
        throw e;
    }

    syncing = false;

    if (syncAgain) {
        setTimeout(syncHostStorage, 0);
    }
};

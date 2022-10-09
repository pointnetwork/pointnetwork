import Queue from '../../util/queue';
import logger from '../../core/log';
const log = logger.child({module: 'callbacks'});

const callbacks: Record<string, Queue> = {};

export enum EventTypes {
    FILE_UPLOAD_STATUS_CHANGED = 'FILE_UPLOAD_STATUS_CHANGED',
    FILE_DOWNLOAD_STATUS_CHANGED = 'FILE_DOWNLOAD_STATUS_CHANGED',
    CHUNK_UPLOAD_STATUS_CHANGED = 'CHUNK_UPLOAD_STATUS_CHANGED',
    CHUNK_DOWNLOAD_STATUS_CHANGED = 'CHUNK_DOWNLOAD_STATUS_CHANGED'
}

const enq = <Type>(eventType: string, key: string, fn: () => Type): Promise<Type> => {
    const fullKey = eventType + '|' + key;
    if (! callbacks[fullKey]) callbacks[fullKey] = new Queue();

    return new Promise((resolve, reject) => {
        callbacks[fullKey].enqueue(async() => {
            try {
                const result = await fn();
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
    });
};

export const waitForEvent = <Type>(eventType: string, key: string, fn: () => Type) => {
    const res = enq(eventType, key, fn);
    return res;
};

export const processQueue = async(eventType: string, key: string) => {
    const fullKey = eventType + '|' + key;
    if (callbacks[fullKey]) {
        log.trace({eventType, key}, 'processQueue, queue len = ' + callbacks[fullKey].length);
        const readyCallbacks = [];
        while (!callbacks[fullKey].isEmpty()) {
            readyCallbacks.push(callbacks[fullKey].dequeue());
        }

        for (const c of readyCallbacks) {
            setImmediate(async() => {
                await c();
            });
        }
    } else {
        log.trace({eventType, key}, 'processQueue, queue len = ' + 0);
    }
};
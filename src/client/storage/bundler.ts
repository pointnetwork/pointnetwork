import axios from 'axios';
import logger from '../../core/log';

const log = logger.child({module: 'Bundler'});

class BundlerCacheDownloadError extends Error {}

export const downloadChunk = async (url: string, chunkId: string) => {
    try {
        const {data: buf} = await axios.request({
            method: 'GET',
            url: `${url}/${chunkId}`,
            responseType: 'arraybuffer'
        });
        log.trace({chunkId}, 'Successfully downloaded chunk from Bundler cache');
        return buf;
    } catch (err) {
        const error = new BundlerCacheDownloadError('Failed to download chunk from Bundler cache');
        log.error({chunkId, url, stack: error.stack}, error.message);
        throw error;
    }
};

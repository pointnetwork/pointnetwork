import config from 'config';
import logger from '../../core/log';
import path from 'path';
import {isChineseTimezone, resolveHome} from '../../util';

export const CHUNKINFO_PROLOGUE = 'PN^CHUNK\x05$\x06z\xf5*INFO';
export const CONCURRENT_DOWNLOAD_DELAY = Number(config.get('storage.concurrent_download_delay'));
export const UPLOAD_LOOP_INTERVAL = Number(config.get('storage.upload_loop_interval'));
export const UPLOAD_RETRY_LIMIT = Number(config.get('storage.upload_retry_limit'));
export const CHUNK_SIZE = Number(config.get('storage.chunk_size_bytes'));
export const GATEWAY_URL: string = config.get('storage.arweave_gateway_url');
export const USE_ARLOCAL = Boolean(config.get('storage.use_arlocal'));
export const MODE: string = config.get('mode');
export const HOST: string = config.get('storage.arweave_host');
export const PORT = Number(config.get('storage.arweave_port'));
export const PROTOCOL: string = config.get('storage.arweave_protocol');
export const TIMEOUT = Number(config.get('storage.request_timeout'));
export const DOWNLOAD_CACHE_PATH: string = path.join(
    resolveHome(config.get('datadir')),
    config.get('storage.download_cache_path')
);
export const UPLOAD_CACHE_PATH = path.join(
    resolveHome(config.get('datadir')),
    config.get('storage.upload_cache_path')
);
export const VERSION_MAJOR: string = config.get('storage.arweave_experiment_version_major');
export const VERSION_MINOR: string = config.get('storage.arweave_experiment_version_minor');
export const FILES_DIR = path.join(
    resolveHome(config.get('datadir')),
    config.get('storage.files_path')
);
export const CONCURRENT_UPLOAD_LIMIT = Number(config.get('storage.concurrent_upload_limit'));
export const CONCURRENT_VALIDATION_LIMIT = Number(config.get('storage.concurrent_validation_limit'));
export const REQUEST_TIMEOUT = Number(config.get('storage.request_timeout'));
export const UPLOAD_EXPIRE = Number(config.get('storage.upload_expire'));
export const BUNDLER_URL = isChineseTimezone()
    ? config.get('storage.arweave_bundler_url_fallback')
    : config.get('storage.arweave_bundler_url');

export const BUNDLER_DOWNLOAD_URL = `${BUNDLER_URL}/download`;

export const log = logger.child({module: 'Storage'});

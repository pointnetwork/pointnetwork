import download from './download';
import download_zappdev from './download.zappdev';
// import upload from './upload';
import upload_zappdev from './upload.zappdev';
import {MODE} from '../config';

export const getChunk = MODE === 'zappdev' ? download_zappdev : download;
// export const uploadChunk = MODE === 'zappdev' ? upload_zappdev : upload;

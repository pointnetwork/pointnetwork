import {restartFileUploads, restartChunkUploads, uploadLoop} from '../uploader';

const init = () => {
    (async() => {
        // await restartFileUploads();
        // await restartChunkUploads();
        uploadLoop();
    })();
    // TODO: re-enable this validation!
    // chunkValidatorLoop();
};

export default init;

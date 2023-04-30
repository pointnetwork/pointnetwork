import {restartUploadsDownloads, uploadLoop} from '../uploader.js';

const init = () => {
    (async() => {
        await restartUploadsDownloads();
        uploadLoop();
        // downloadLoop();
    })();
    // TODO: re-enable this validation!
    // chunkValidatorLoop();
};

export default init;

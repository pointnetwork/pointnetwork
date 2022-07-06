import {uploadLoop} from '../uploader';

const init = () => {
    uploadLoop();
    // TODO: re-enable this validation!
    // chunkValidatorLoop();
};

export default init;

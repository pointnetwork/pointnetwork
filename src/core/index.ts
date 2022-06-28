import startApiServer from '../api';
import startProxy from '../client/proxy';
import {init as initStorage} from '../client/storage';

const startPoint = async () => {
    await Promise.all([
        startApiServer(),
        startProxy(),
        initStorage()
    ]);
};

export default startPoint;

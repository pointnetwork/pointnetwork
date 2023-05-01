import startApiServer from '../api/index.js';
import startProxy from '../client/proxy/index.js';
import initStorage from '../client/storage/init/index.js';

const startPoint = async () => {
    await Promise.all([startApiServer(), startProxy(), initStorage()]);
};

export default startPoint;

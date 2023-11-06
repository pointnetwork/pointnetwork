import startApiServer from '../api/index';
import startProxy from '../client/proxy/index';
import initStorage from '../client/storage/init/index';

const startPoint = async () => {
    await Promise.all([startApiServer(), startProxy(), initStorage()]);
};

export default startPoint;

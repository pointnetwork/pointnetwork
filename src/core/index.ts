import startApiServer from '../api';
import startProxy from '../client/proxy';
import initStorage from '../client/storage/init';

const startPoint = async () => {
    await Promise.all([startApiServer(), startProxy(), initStorage()]);
};

export default startPoint;

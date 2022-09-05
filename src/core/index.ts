import startApiServer from '../api';
import startProxy from '../client/proxy';
// import startProxy from '../client/proxy/alt';
import initStorage from '../client/storage/init';
import startBackgroundJobs from '../background/start_background_jobs';

const startPoint = async () => {
    await Promise.all([startApiServer(), startProxy(), initStorage(), startBackgroundJobs()]);
};

export default startPoint;

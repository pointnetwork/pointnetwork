import config from 'config';
import logger from '../core/log.js';
import apiServer from './server.js';
const log = logger.child({module: 'ApiServer'});

const apiConfig = config.get('api') as Record<string, string>;

const startApiServer = async () => {
    await apiServer.listen(parseInt(apiConfig.port), apiConfig.address, async err => {
        if (err) {
            log.error(err, 'Error from Point API');
        }
    });
};

export default startApiServer;

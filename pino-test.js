const pino = require('pino');
const udpTransport = require('pino-udp');

const options = {level: 'info'};

const logger = pino(options, new udpTransport({
    address: '127.0.0.1',
    port: 12201
}));

(async function(){
    while(true) {
        console.log('pushing pino');
        logger.info('test to udp');
        await new Promise((res) => setTimeout(res, 5000));
    }
})();

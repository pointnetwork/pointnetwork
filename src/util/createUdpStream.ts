import {createSocket, Socket} from 'dgram';
import {Writable} from 'stream';

const INITIAL_RETRY_INTERVAL_TIME = 1000; // 1s
const MAX_RETRY_INTERVAL = 1000 * 60 * 10; // 10m

export function createUdpStream(options: { address: string; port: number }) {
    const socket: Socket = createSocket('udp4');
    let retryInterval = INITIAL_RETRY_INTERVAL_TIME;
    let lastAttempt: number | undefined;
    return new Writable({
        final: () => socket.close(),
        write: async (data, _encoding, done) => {
            if (!lastAttempt ||  Date.now() - lastAttempt > retryInterval) {
                socket.send(data, 0, data.length, options.port, options.address, (error) => {
                    if (error) {
                        const nextRetryInterval = retryInterval * 2;
                        retryInterval = nextRetryInterval > MAX_RETRY_INTERVAL ?
                            MAX_RETRY_INTERVAL : nextRetryInterval;
                        lastAttempt = Date.now();
                    } else {
                        lastAttempt = undefined;
                        retryInterval = INITIAL_RETRY_INTERVAL_TIME;
                    }
                });
            }
            done?.();
        }
    });
}

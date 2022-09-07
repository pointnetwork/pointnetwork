import {Logger} from 'pino';

const sigs = [
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGUSR1',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM'
] as const;

let exiting = false;

async function _exit() {
    if (exiting) return;
    exiting = true;
    process.exit(1);
    // TODO: shut down everything else
}

export function initProcessListeners(log: Logger) {
    sigs.forEach(function(sig) {
        process.on(sig, function() {
            log.info(`Received signal ${sig}, shutting down...`);
            _exit();
        });
    });

    process.on('uncaughtException', err => {
        log.error(err, 'Error: uncaught exception');
    });

    process.on('unhandledRejection', (err: Error) => {
        log.error(err, 'Error: unhandled rejection');
    });
}

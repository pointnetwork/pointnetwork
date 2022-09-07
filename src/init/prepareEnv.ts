import path from 'path';
const app = require(path.resolve(__dirname, '..', '..', 'package.json'));

export function prepareEnv() {
    const RUNNING_PKG_MODE = Boolean((process as typeof process & {pkg?: unknown}).pkg);

    if (RUNNING_PKG_MODE) {
        // when running inside the packaged version the configuration should be
        // retrieved from the internal packaged config
        // by default config library uses process.cwd() to reference the config folder
        // when using vercel/pkg process.cwd references real folder and not packaged folder
        // overwriting this env variable fixes the problems
        process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '..', '..', 'config');
    }

    process.env.HARDHAT_CONFIG = path.resolve(
        __dirname,
        '..',
        '..',
        'hardhat',
        'hardhat.config.js'
    );

    // Disable https://nextjs.org/telemetry
    process.env.NEXT_TELEMETRY_DISABLED = '1';

    process.env.POINT_ENGINE_VERSION = app.version;
}

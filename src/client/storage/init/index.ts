import init_normal from './init.js';
import init_zappdev from './init.zappdev.js';
import {MODE} from '../config.js';

const init = MODE === 'zappdev' ? init_zappdev : init_normal;

export default init;

import init_normal from './init';
import init_zappdev from './init.zappdev';
import {MODE} from '../config';

const init = MODE === 'zappdev' ? init_zappdev : init_normal;

export default init;

import init_normal from './init';
import init_arlocal from './init_arlocal';
import {MODE} from '../config';

const init = MODE === 'zappdev' ? init_arlocal : init_normal;

export default init;

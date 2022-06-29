import getChunk_normal from './getChunk';
import getChunk_arlocal from './getChunk_arlocal';
import {MODE} from '../config';

const getChunk = MODE === 'zappdev' ? getChunk_arlocal : getChunk_normal;

export default getChunk;

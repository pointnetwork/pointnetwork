import uploadChunk_normal from './uploadChunk';
import uploadChunk_arlocal from './uploadChunk_arlocal';
import {MODE} from '../config';

const uploadChunk = MODE === 'zappdev' ? uploadChunk_arlocal : uploadChunk_normal;

export default uploadChunk;

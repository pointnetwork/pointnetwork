import {keccak256} from 'ethereumjs-util';

export const hashFn = (buf: Buffer) => keccak256(buf);

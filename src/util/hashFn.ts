import ethUtil from 'ethereumjs-util';

export const hashFn = (buf: Buffer) => ethUtil.keccak256(buf);

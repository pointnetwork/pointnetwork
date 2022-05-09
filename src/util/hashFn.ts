import {keccak256} from 'ethereumjs-util';

/**
 * Hashes a Buffer using keccak256.
 */
export const hashFn = (buf: Buffer) => keccak256(buf);

/**
 * Checks if the hashed contents of a Buffer match the expected hash.
 */
export const validateContentAgainstHash = (buf: Buffer, expectedHash: string) =>
    hashFn(buf).toString('hex') === expectedHash;

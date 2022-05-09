/**
 * Concatenates chunks into a single Buffer.
 */
export function bufferFromChunks(chunks: Buffer[], chunkSize: number, totalSize: number): Buffer {
    return Buffer.concat([
        ...chunks.slice(0, -1),
        // We should trim the trailing zeros from the last chunk
        chunks[chunks.length - 1].slice(0, totalSize - (chunks.length - 1) * chunkSize)
    ]);
}

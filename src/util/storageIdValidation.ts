export const isValidStorageId = (id: string) => /^(0x|)[0-9a-f]{64}$/ig.test(id);

export const isZeroStorageId = (id: string) => /^(0x|)[0]{1,64}$/ig.test(id);

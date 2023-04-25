export const delay = (ms: number) => new Promise(resolve => {setTimeout(resolve, ms);});

const SOON = 10;
export const setSoon = (cb: CallableFunction) => setTimeout(cb, SOON);
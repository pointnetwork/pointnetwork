export const _timeout = <T>(prom: Promise<T>, time: number, exception: string) => {
    let timer: NodeJS.Timeout;
    return Promise.race([
        prom,
        new Promise((_r, rej) => (timer = setTimeout(() => rej(new Error(exception)), time)))
    ]).finally(() => clearTimeout(timer));
};
import {Keplr} from '@keplr-wallet/provider';
import {MockMessageRequester} from '@keplr-wallet/router-mock/build/requester';
import {Message} from '@keplr-wallet/router';
import {extensionId, pointUrl} from './keplrBackground';
const requester = new MockMessageRequester(extensionId, pointUrl);

const original = requester.sendMessage;

requester.sendMessage = async function <M extends Message<unknown>>(port: string, msg: M):
  Promise<M extends Message<infer R> ? R : never> {
    // here we can intercept messages
    return original.apply(this, [port, msg]) as Promise<M extends Message<infer R> ? R : never>;
};

export const keplr = new Keplr(
    '0.11.12',
    'extension',
    requester
);

export const send = async (data: {
    method: string;
    network: string;
    params?: unknown[];
    id?: number;
}) => {
    const {method, params} = data;
    const methodName = method.split('_')[1];

    // eslint-disable-next-line @typescript-eslint/ban-types
    const keplrMethod = keplr[methodName as keyof Keplr] as Function;
    if (typeof keplrMethod !== 'function') {
        throw new Error('Not valid method');
    }

    const result = (await keplrMethod.apply(keplr, params)) || {};
    return result;
};

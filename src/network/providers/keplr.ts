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

import {BACKGROUND_PORT, JSONUint8Array, Message} from '@keplr-wallet/router';
import {MockRouter} from '@keplr-wallet/router-mock/build/router';
import {MemoryKVStore} from '@keplr-wallet/common';
import {ApproveInteractionMsg, CreateMnemonicKeyMsg, init, RestoreKeyRingMsg, ScryptParams} from '@keplr-wallet/background';
import scrypt from 'scrypt-js';
import {Buffer} from 'buffer/';
import {EmbedChainInfos, PrivilegedOrigins} from '../config';
import {ContentScriptMessageRequester, ExtensionEnv} from '@keplr-wallet/router-extension';
import {getMnemonic} from '../../wallet/keystore';
const crypto = require('crypto').webcrypto;
const noop = () => { /* noop */ };

export const pointUrl = 'https:/point';
export const extensionId = 'keplrBackground';

const passphrase = '12345678'; //  where to get this?
const router = new MockRouter(ExtensionEnv.produceEnv);

// router.addGuard(ExtensionGuards.checkOriginIsValid);
// router.addGuard(ExtensionGuards.checkMessageIsInternal);

global.browser = {
    idle: {onStateChanged: {addListener: noop}},
    notifications: {create: noop},
    runtime: {
        getURL: () => pointUrl,
        id: extensionId,
        getBackgroundPage: () => null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sendMessage: async (info: any) => {
            if (info.type === 'push-interaction-data') {
                try {
                    console.log({dataaa: info.msg.data.data.signDoc});
                    const a = await sendKeplrMessage(
                        BACKGROUND_PORT,
                        new ApproveInteractionMsg(info.msg.data.id, info.msg.data.data.signDoc)
                    );
                    console.log({a});
                } catch (eee) {
                    console.log({eee});
                }

            }
        }
    },
    windows: {
        create: async () => ({id: extensionId}),
        get: async () => ({tabs: [{id: extensionId}]}),
        update: async () => null
    },
    tabs: {
        get: async () => ({status: 'complete'}),
        sendMessage: async () => (JSONUint8Array.wrap({status: 'complete'})),
        query: async () => []
    },
    extension: {getViews: () => []}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global.window as any) = {location: {origin: pointUrl, href: pointUrl}};

init(
    router,
    (prefix: string) => new MemoryKVStore(prefix),
    new ContentScriptMessageRequester(),
    EmbedChainInfos,
    PrivilegedOrigins,
    {
        rng: (array) => Promise.resolve(crypto.getRandomValues(array)),
        scrypt: async (text: string, params: ScryptParams) => await scrypt.scrypt(
            Buffer.from(text),
            Buffer.from(params.salt, 'hex'),
            params.n,
            params.r,
            params.p,
            params.dklen
        )
    },
    {
        create: (params: {
      iconRelativeUrl?: string;
      title: string;
      message: string;
    }) => {
            browser?.notifications?.create({
                type: 'basic',
                iconUrl: params.iconRelativeUrl
                    ? browser?.runtime.getURL(params.iconRelativeUrl)
                    : undefined,
                title: params.title,
                message: params.message
            });
        }
    }
);

export async function startKeplrBackground() {
    router.listen(BACKGROUND_PORT);
    const restoreKeyResult = await sendKeplrMessage(BACKGROUND_PORT, new RestoreKeyRingMsg());
    if (restoreKeyResult.return.status !== 1) {
        throw 'Cannot initialize keplr background wallet';
    }
    const restoreUsingMnemonic = await sendKeplrMessage(BACKGROUND_PORT,  new CreateMnemonicKeyMsg('sha256',
        getMnemonic(),
        passphrase, {},
        {account: 0,   change: 0, addressIndex: 0} // is this BIP44HDPath ok?
    ));
    if (restoreUsingMnemonic.return.status !== 3) {
        throw 'Cannot initialize keplr background wallet with given mnemonic';
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendKeplrMessage<T = any>(port: string, msg: Message<T>) {
    return JSONUint8Array.unwrap(
        await new Promise((resolve) => {
            MockRouter.eventEmitter.emit('message', {
                message: {
                    port,
                    type: msg.type(),
                    msg: JSONUint8Array.wrap(msg)
                },
                sender: {
                    id: extensionId,
                    url: pointUrl,
                    resolver: resolve
                }
            });
        })
    );
}

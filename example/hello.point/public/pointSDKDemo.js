let socket;
let httpProtocol = window.location.protocol;
let wsProtocol = (httpProtocol === 'https:') ? 'wss:' : 'ws:';

console.info('**** LOADED LOCAL DEMO POINT SDK ****');

pointSDKDemo = {
    version: "0.0.1 pointSDKDemo(Hello.point)",
    websocket: {
        open: (callback) => {
            if (!socket) {
                socket = new WebSocket(`${wsProtocol}//${window.location.hostname}`);
                socket.onmessage = (e) => callback(e.data);
                return socket;
            }
        }
    },
    storage: {
        /*
            NOTE : postFile & getFile interact with the storage layer at the proxy level
            which is why the requets are made to /_storage/ and not /v1/api/
        */
        postFile: async (file) => {
            // TODO validate that file is a FormData object
            let response = await fetch('/_storage/', {
                method: 'POST',
                body: file
                // headers NOT required when passing FormData object
            })
            return await response.json()
        },
        getFile: async ({id}) => {
            let response = await fetch(`/_storage/${id}`);
            let blob = await response.blob();
            return await blob;
        },
        putString: async (data) => {
            let response = await fetch('/v1/api/storage/putString', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        },
        getString: async({id}) => {
            let response = await fetch(`/v1/api/storage/getString/${id}`)
            return await response.json();
        }
    },
    status: {
        ping: async () => {
            let response = await fetch('/v1/api/status/ping')
            return await response.json()
        }
    },
    wallet: {
        address: async () => {
            let address = await fetch('/v1/api/wallet/address')
            return await address.json()
        },
        balance: async () => {
            let balance = await fetch('/v1/api/wallet/balance')
            return await balance.json()
        },
        hash: async () => {
            let hash = await fetch('/v1/api/wallet/hash')
            return await hash.json()
        },
    },
    subscriptions: {
        removeSubscriptionById: async(meta) => {
            let payload = {
                type: 'removeSubscriptionById',
                params: meta
            }
            socket.send(JSON.stringify(payload))
        }
    },
    contract: {
        call: async (meta) => {
            let response = await fetch('/v1/api/contract/call', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meta)
            })
            return await response.json()
        },
        send: async (meta) => {
            let response = await fetch('/v1/api/contract/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meta)
            })
            return await response.json()
        },
        load: async({contract}) => {
            let response = await fetch(`/v1/api/contract/load/${contract}`)
            return await response.json()
        },
        subscribe: async(meta) => {
            let payload = {
                type: 'subscribeContractEvent',
                params: meta
            }
            socket.send(JSON.stringify(payload))
        }
    }
}

window.point = pointSDKDemo
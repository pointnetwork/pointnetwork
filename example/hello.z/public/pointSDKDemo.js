pointSDKDemo = {
    status: {
        hello: () => {
            return "world";
        },
        ping: async () => {
            let response = await fetch('/api/ping')
            return await response.json()
        }
    },
    wallet: {
        address: async () => {
            let address = await fetch('/api/wallet/address')
            return await address.json()
        },
        balance: async () => {
            let balance = await fetch('/api/wallet/balance')
            return await balance.json()
        },
    },
    contract: {
        call: async (meta) => {
            let response = await fetch('/api/contract/call', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(meta)
            })
            return await response.json()
        }
    }
}

window.point = pointSDKDemo
// A dummy API

export default {
  wallet: {
    getAddress: async () => '0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB',
    getBalance: async () => '1000000000000000000',
  },
  contract: {
    get: async ({ host, contractName, method, args }: { host: string, contractName: string, method: string, args?: Array<string> }): Promise<string> => {
      const hosts = {
        store: {
          Store: {
            getStores: () => [{
              id: 0,
              name: 'Walmart',
              description: 'Walmart: Save Money. Live Better.',
              logo: 'images/store-logo-0.jpg',
            }, {
              id: 1,
              name: 'Sears',
              description: 'Sears: Making Moments Matter.',
              logo: 'images/store-logo-1.png',
            }],
            getProducts: (store) => [{
              storeId: '0',
              productId: '0',
              name: 'Toothbrush',
              description: 'A tooth cleaner',
              price: 1
            }, {
              storeId: '0',
              productId: '1',
              name: 'Book',
              description: 'A page turner',
              price: 2
            }, {
              storeId: '1',
              productId: '2',
              name: 'MacBook Pro',
              description: 'A new computer',
              price: 12
            }].filter(p => p.storeId === store)
          }
        }
      } as { [key: string]: { [key: string]: { [key: string]: (params?: string) => Array<object> }} }

      if (!host || !(host in hosts)) {
        throw new Error(`Invalid host name '${ host }'`)
      }

      if (!contractName || !(contractName in (hosts[host]!))) {
        throw new Error(`Contract '${ contractName }' is not available for host ${ host }`)
      }

      if (!method || !(method in (hosts[host]![contractName]!))) {
        throw new Error(`Contract ${ contractName } does not support '${ method }' method`)
      }

      return JSON.stringify(hosts[host]![contractName]![method]!(...(args || [])))
    }
  }
}

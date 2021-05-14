// A dummy API

export default {
  wallet: {
    getWalletAddress: async () => '0x4f5877E51067d0d68784aA74C39871cb2eF2D9eB',
  },
  contract: {
    get: async ({ host, contractName, method }: { host: string, contractName: string, method: string }): Promise<string> => {
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
            }]
          }
        }
      } as { [key: string]: { [key: string]: { [key: string]: () => Array<object> }} }

      if (!host || !(host in hosts)) {
        throw new Error(`Invalid host name "${ host }"`)
      }

      if (!contractName || !(contractName in (hosts[host]!))) {
        throw new Error(`Contract "${ contractName }" is not available for host ${ host }`)
      }

      if (!method || !(method in (hosts[host]![contractName]!))) {
        throw new Error(`Contract ${ contractName } does not support "${ method }" method`)
      }

      return JSON.stringify(hosts[host]![contractName]![method]!())
    }
  }
}

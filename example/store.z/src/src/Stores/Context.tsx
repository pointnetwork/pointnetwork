import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import point from '../point'

export type Store = {
  id: string,
  name: string,
  logo: string,
  description: string,
}

const defaultContext = {
  storeList: [] as Array<Store>
}

const StoreContext = createContext(defaultContext)

export const useStoreContext = () => useContext(StoreContext)
export const ProvideStoreContext = ({ children }: { children: ReactNode }) => {
  const [storeList, setStoreList] = useState<Array<Store>>([])

  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        let {data: storesData} = await window.point.contract.call({
          contract: 'Store',
          method: 'getStores',
        });

        let stores: Store[] = []

        console.log({ storesData })

        if (Array.isArray(storesData)) {
          storesData.forEach((storeData:any) => {
            let store = {
              id: storeData[0],
              name: storeData[1],
              description: storeData[2],
              logo: storeData[3]
            }

            stores.push(store)
          })

          setStoreList(stores as Store[]) // TODO: error handling
        }
      } catch (e) {
        console.error('Contract call error:', e)
      }
    })()
  }, [])

  const context = {
    storeList,
  }

  return <StoreContext.Provider value={ context }>{ children }</StoreContext.Provider>
}

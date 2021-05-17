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
      setStoreList(JSON.parse(await point.contract.get({
        host: 'store',
        contractName: 'Store',
        method: 'getStores'
      })) as Store[]) // TODO: error handling
    })()
  }, [])

  const context = {
    storeList,
  }

  return <StoreContext.Provider value={ context }>{ children }</StoreContext.Provider>
}

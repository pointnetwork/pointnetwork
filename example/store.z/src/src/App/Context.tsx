import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import point from '../point'

export type Store = {
  id: string,
  name: string,
  logo: string,
  description: string,
}

const defaultContext = {
  walletAddress: undefined as string | undefined,
  storeList: [] as Array<Store>
}

const AppContext = createContext(defaultContext)

export const useAppContext = () => useContext(AppContext)
export const ProvideAppContext = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string>()
  const [storeList, setStoreList] = useState<Array<Store>>([])

  useEffect(() => {
    (async () => {
      setWalletAddress(await point.wallet.getWalletAddress())
    })()
  }, [])

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
    walletAddress,
    storeList
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

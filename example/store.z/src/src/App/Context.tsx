import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'
import point from '../point'

const defaultContext = {
  walletAddress: undefined as string | undefined,
}

const AppContext = createContext(defaultContext)

export const useAppContext = () => useContext(AppContext)
export const ProvideAppContext = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string>()

  useEffect(() => {
    (async () => {
      setWalletAddress(await point.wallet.getWalletAddress())
    })()
  }, [])

  const context = {
    walletAddress,
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

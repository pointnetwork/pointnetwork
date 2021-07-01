import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'

const defaultContext = {
  walletAddress: undefined as string | undefined,
  walletBalance: undefined as string | undefined
}

const AppContext = createContext(defaultContext)

export const useAppContext = () => useContext(AppContext)
export const ProvideAppContext = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string>()
  const [walletBalance, setWalletBalance] = useState<string>()
  useEffect(() => {
    (async () => {
      // @ts-ignore
      const {data: {address}} = await window.point.wallet.address();
      // @ts-ignore
      const {data: {hash}} = await window.point.wallet.hash();

      setWalletAddress(address);
      setWalletBalance(hash);
    })()
  }, [])

  const context = {
    walletAddress,
    walletBalance
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

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
      setWalletAddress(await window.point.wallet.address())
      setWalletBalance('0') // set to 0 for now
    })()
  }, [])

  const context = {
    walletAddress,
    walletBalance
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

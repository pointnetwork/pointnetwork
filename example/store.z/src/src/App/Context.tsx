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
      console.log({'window.point.wallet.address': window.point.wallet.address});
      // @ts-ignore
      console.info('wallet address:', await window.point.wallet.address());
      // @ts-ignore
      console.info('wallet balance:', await window.point.wallet.hash());
      // @ts-ignore
      setWalletAddress(await window.point.wallet.address());
      // @ts-ignore
      setWalletBalance(await window.point.wallet.hash());
    })()
  }, [])

  const context = {
    walletAddress,
    walletBalance
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

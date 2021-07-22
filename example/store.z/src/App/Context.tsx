import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'

const defaultContext = {
  walletAddress: undefined as string | undefined,
  walletError: undefined as Error | undefined,
}

const AppContext = createContext(defaultContext)

export const useAppContext = () => useContext(AppContext)
export const ProvideAppContext = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string>();
  const [walletError, setWallerError] = useState<Error>();

  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const {data: {address}} = await window.point.wallet.address();

        setWalletAddress(address);

      } catch (e) {
        setWallerError(e);
      }
    })()
  }, [])

  const context = {
    walletAddress,
    walletError,
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from "wouter";

const defaultContext = {
  walletAddress: undefined,
  walletError: undefined,
  goHome: () => {}
};

const AppContext = createContext(defaultContext);

export const useAppContext = () => useContext(AppContext)

export const ProvideAppContext = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState();
  const [walletError, setWallerError] = useState();
  const [, setLocation] = useLocation();

  useEffect(() => {
    (async () => {
      try {
        const {data: {address}} = await window.point.wallet.address();

        setWalletAddress(address);
      } catch (e) {
        setWallerError(e);
      }
    })()
  }, [])

  const goHome = useCallback(async () => {
    setLocation('/');
  }, []);

  const context = {
    walletAddress,
    walletError,
    goHome
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

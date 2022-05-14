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
  const [walletIdentity, setWalletIdentity] = useState();
  const [walletError, setWallerError] = useState();
  const [, setLocation] = useLocation();

  const fetchData = async () => {
    try {
      const {data: {address}} = await window.point.wallet.address();
      const {data: {identity}} = await window.point.identity.ownerToIdentity({owner: address});

      setWalletIdentity(identity);
    } catch (e) {
      setWallerError(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [])

  const goHome = useCallback(async () => {
    setLocation('/');
  }, []);

  const context = {
    walletIdentity,
    walletError,
    goHome
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

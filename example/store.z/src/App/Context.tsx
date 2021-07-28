import React, { createContext, ReactNode, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from "wouter";
import { Subscription } from '~/@types';

const defaultContext = {
  walletAddress: undefined as string | undefined,
  walletError: undefined as Error | undefined,
  goHome: () => {},
  addSubscription: (() => {}) as (s: Subscription) => void,
};

const AppContext = createContext(defaultContext);

export const useAppContext = () => useContext(AppContext)
export const ProvideAppContext = ({ children }: { children: ReactNode }) => {
  const [walletAddress, setWalletAddress] = useState<string>();
  const [walletError, setWallerError] = useState<Error>();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>();
  const [, setLocation] = useLocation();

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

  const addSubscription = useCallback((subscription: Subscription) => {
    setSubscriptions((subscriptions) => (subscriptions || []).concat(subscription));
  }, [setSubscriptions]);

  const goHome = useCallback(async () => {
    if (subscriptions && subscriptions.length) {
      for (const subscription of subscriptions) {
        await subscription.unsubscribe();
      }
    }

    setSubscriptions([]);
    setLocation('/');
  }, [subscriptions]);

  const context = {
    walletAddress,
    walletError,
    addSubscription,
    goHome
  }

  return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}

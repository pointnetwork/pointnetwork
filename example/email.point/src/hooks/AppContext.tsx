import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WalletService from '@services/WalletService';
import * as IdentityService from '@services/IdentityService';

const defaultContext: {
  walletAddress?: Address;
  identity?: Identity;
  walletError: undefined;
} = {
  walletAddress: undefined,
  walletError: undefined,
  identity: undefined,
};

const AppContext = createContext(defaultContext);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider: React.FC = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<Address | undefined>();
  const [identity, setIdentity] = useState<Identity | undefined>();
  const [walletError, setWallerError] = useState();

  useEffect(() => {
    (async () => {
      try {
        const address = await WalletService.getAddress();
        const identity = await IdentityService.ownerToIdentity(address);
        setWalletAddress(address);
        setIdentity(identity);
      } catch (e) {
        //setWallerError(e);
        console.error(e);
      }
    })();
  }, []);

  const context = {
    walletAddress,
    walletError,
    identity,
  };

  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
};

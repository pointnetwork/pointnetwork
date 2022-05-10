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

  const getLastNonZappId = async (owner) => {
    let identitiesFetched = await window.point.contract.events(
      {host: '@', contract: 'Identity', event: 'IdentityRegistered', filter: {
        identityOwner: owner
      }});
    let ikvsetFetched = await window.point.contract.events(
      {host: '@', contract: 'Identity', event: 'IKVSet'});
    let nonZappIdentities = [];
    for (const id of identitiesFetched.data){
        if (ikvsetFetched.data != ''){
          const domainExists = ikvsetFetched.data.filter((ikve) => 
              ikve.data.identity == id.data.handle && ikve.data.key == 'zdns/routes').length > 0;
          if(!domainExists){
            nonZappIdentities.push(id);
          }
        }else{
          nonZappIdentities.push(id);
        }
    }
    const lastEntry = nonZappIdentities.reduce((prev, current) =>
        prev.blockNumber > current.blockNumber ? prev : current
    );
    return lastEntry.data.handle;
  }

  const fetchData = async () => {
    try {
      const {data: {address}} = await window.point.wallet.address();
      const identity = await getLastNonZappId(address);

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

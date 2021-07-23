import React, { createContext, ReactNode, useContext, useState, useEffect } from 'react'

export type Store = {
  id: string,
  name: string,
  logo: string,
  description: string,
}

const defaultContext = {
  storeList: undefined as Store[] | undefined,
  storeListError: undefined as Error | undefined
}

const StoreContext = createContext(defaultContext)

export const useStoreContext = () => useContext(StoreContext)
export const ProvideStoreContext = ({ children }: { children: ReactNode }) => {
  const [storeList, setStoreList] = useState<Store[] | undefined>();
  const [storeListError, setStoreListError] = useState<Error | undefined>();

  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore
        const response = await window.point.contract.call({contract: 'Store', method: 'getStores'});
        const {data: stores} = response;

        if (!Array.isArray(stores)) {
          console.error('Incorrect getStores response:', response);
          throw new Error('Incorrect stores data');
        }

        setStoreList(
          stores.map(([id, name, description, logo]) => ({id, name, description, logo})) as Store[]
        );
      } catch (e) {
        setStoreListError(e);
      }
    })()
  }, [])

  const context = {
    storeList,
    storeListError
  }

  return <StoreContext.Provider value={ context }>{ children }</StoreContext.Provider>
}

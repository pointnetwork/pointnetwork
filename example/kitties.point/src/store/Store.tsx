import React, { createContext, useContext, useState, useReducer } from "react";
import { FetchedKitty } from "../hooks/useFetchKitty";
import { FetchedOffer } from "../hooks/useKittyOffer";

const StoreContext = createContext<Store | null>(null);

type KittiesReducerActions = {
  type: "addKitty";
  payload: FetchedKitty;
};
type KittiesMap = { [key: number]: FetchedKitty };
const kittiesReducer: React.Reducer<KittiesMap, KittiesReducerActions> = (
  state,
  action
) => {
  switch (action.type) {
    case "addKitty":
      return { ...state, [action.payload.id]: action.payload };
    default:
      throw new Error();
  }
};

type AddOfferAction = {
  type: "addOffer";
  payload: FetchedOffer;
};
type RemoveOfferAction = {
  type: "removeOffer";
  payload: number;
};
type OffersReducerActions = AddOfferAction | RemoveOfferAction;
type OffersMap = { [key: number]: FetchedOffer };
const offersReducer: React.Reducer<OffersMap, OffersReducerActions> = (
  state,
  action
) => {
  switch (action.type) {
    case "addOffer": {
      const newState = { ...state };
      // Remove any old entries with the same id
      delete newState[action.payload.id];
      // Then add new entry
      newState[action.payload.id] = action.payload;
      return newState;
    }
    case "removeOffer": {
      const newState = { ...state };
      delete newState[action.payload];
      return newState;
    }
    default:
      throw new Error();
  }
};

export interface Store {
  account: null | string;
  isOwner: boolean;
  kitties: KittiesMap;
  offers: OffersMap;

  setAccount: (account: null | string) => void;
  setIsOwner: (isOwner: boolean) => void;
  addKitty: (kitty: FetchedKitty) => void;
  addOffer: (offer: FetchedOffer) => void;
  removeOffer: (kittyId: number) => void;
}

export const StoreProvider: React.FC = ({ children }) => {
  const [account, setAccount] = useState<Store["account"]>(null);
  const [kitties, dispatchKitties] = useReducer(kittiesReducer, {});
  const [offers, dispatchOffers] = useReducer(offersReducer, {});
  const [isOwner, setIsOwner] = useState<Store["isOwner"]>(false);

  const addKitty = (kitty: FetchedKitty) =>
    dispatchKitties({ type: "addKitty", payload: kitty });
  const addOffer = (offer: FetchedOffer) =>
    dispatchOffers({ type: "addOffer", payload: offer });
  const removeOffer = (kittyId: number) =>
    dispatchOffers({ type: "removeOffer", payload: kittyId });

  const store: Store = {
    isOwner,
    setIsOwner,
    account,
    setAccount,
    kitties,
    addKitty,
    offers,
    addOffer,
    removeOffer,
  };

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error("store is not defined");
  }

  return store;
};

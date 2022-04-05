import { useState, useCallback, useEffect } from "react";
import { useMarketPlaceContract } from "./useContract";
import { Contract } from "@ethersproject/contracts";
import { formatEther } from "@ethersproject/units";
import { BigNumber } from "@ethersproject/bignumber";
import { useStore } from "../store/Store";

export interface FetchedOffer {
  id: number;
  price: string;
  _rawPrice: BigNumber;
  seller: string;
  index: number;
  active: boolean;
}

// TODO: Combine with useFetch
export const useKittyOffer = (id: number) => {
  const { addOffer, offers } = useStore();
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [offer, setOffer] = useState<FetchedOffer | null>(null);
  const marketPlace = useMarketPlaceContract();

  const loadOffer = useCallback(
    async (marketPlace: Contract | null, reFetch?: boolean) => {
      setHasError(false);
      setIsFetching(true);

      if (offers[id] && !reFetch) {
        // Kitty already has been loaded, so lets use the value from the store
        setOffer(offers[id]);
        setIsFetching(false);
        return;
      }

      if (!marketPlace) {
        return;
      }

      try {
        const response = await marketPlace.getOffer(id);

        const newOfferData = {
          id,
          price: formatEther(response.price.toString()),
          _rawPrice: response.price,
          seller: response.seller,
          index: response.index.toNumber(),
          active: response.active,
        };

        setOffer(newOfferData);
        addOffer(newOfferData);
      } catch (error) {
        console.error(error);

        setHasError(true);
      } finally {
        setIsFetching(false);
      }
    },
    [id, offers, marketPlace, addOffer]
  );

  useEffect(() => {
    loadOffer(marketPlace);
  }, [id, marketPlace]);

  return { isFetching, hasError, offer, loadOffer };
};

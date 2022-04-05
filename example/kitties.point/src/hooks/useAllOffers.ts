import { useState, useEffect } from "react";
import { useMarketPlaceContract } from "./useContract";

// TODO: Combine with useFetch
export const useAllOffers = () => {
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [offeredKittyIds, setOfferedKittyIds] = useState<number[]>([]);
  const marketPlace = useMarketPlaceContract();

  const loadOfferIds = async () => {
    if (!marketPlace) {
      return;
    }

    setHasError(false);
    setIsFetching(true);

    try {
      const fetchedOffers = await marketPlace.getAllTokenOnSale();
      setOfferedKittyIds(fetchedOffers.map((bn: any) => bn.toString()));
    } catch (error) {
      setHasError(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadOfferIds();
  }, [marketPlace]);

  return { isFetching, hasError, offeredKittyIds, loadOfferIds };
};

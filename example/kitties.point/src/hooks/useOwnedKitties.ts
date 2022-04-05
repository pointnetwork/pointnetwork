import { useState, useEffect } from "react";
import { useKittyCoreContract } from "./useContract";

export const useOwnedKitties = (accountAddress: string | null) => {
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [kitties, setKitties] = useState<number[]>([]);
  const kittyCore = useKittyCoreContract();

  // TODO: Combine with useFetch
  const loadKittyIds = async () => {
    if (!kittyCore || !accountAddress) {
      return;
    }

    setHasError(false);
    setIsFetching(true);

    try {
      const fetchedKitties = await kittyCore.tokensOfOwner(accountAddress);
      setKitties(fetchedKitties.map((bn: any) => bn.toString()));
    } catch (error) {
      setHasError(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadKittyIds();
  }, [kittyCore, accountAddress]);

  return { isFetching, hasError, kitties, loadKittyIds };
};

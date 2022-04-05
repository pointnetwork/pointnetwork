import { useState, useCallback, useEffect } from "react";
import { useKittyCoreContract } from "./useContract";
import { Contract } from "@ethersproject/contracts";

// TODO: Combine with useFetch
export const useKittyOwner = (id: number) => {
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [owner, setOwner] = useState<string | null>(null);
  const kittyCore = useKittyCoreContract();

  const fetchOwner = useCallback(
    async (kittyCore: Contract | null) => {
      setHasError(false);
      setIsFetching(true);

      if (!kittyCore) {
        setHasError(true);
        return;
      }

      try {
        const response = await kittyCore.ownerOf(id);
        setOwner(response);
      } catch (error) {
        console.error("Error in fetchOwner", error);
        setHasError(true);
      } finally {
        setIsFetching(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchOwner(kittyCore);
  }, [kittyCore, id]);

  return { isFetching, hasError, owner, fetchOwner };
};

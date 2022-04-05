import { useState, useCallback, useEffect } from "react";
import { useStore } from "../store/Store";
import { useKittyCoreContract } from "./useContract";
import { Contract } from "@ethersproject/contracts";

export interface FetchedKitty {
  id: number;
  genes: string;
  birthTime: number;
  dadId: number;
  momId: number;
  generation: number;
}

// TODO: Combine with useFetch
export const useFetchKitty = (id: number) => {
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [kittyData, setKittyData] = useState<FetchedKitty | null>(null);
  const { addKitty, kitties } = useStore();
  const kittyCore = useKittyCoreContract();

  const loadKitty = useCallback(
    async (kittyCore: Contract | null, reFetch?: boolean) => {
      setHasError(false);
      setIsFetching(true);

      if (kitties[id] && !reFetch) {
        // Kitty already has been loaded, so lets use the value from the store
        setKittyData(kitties[id]);
        setIsFetching(false);
        return;
      }

      if (!kittyCore) {
        setIsFetching(false);
        return;
      }

      try {
        const response = await kittyCore.getKitty(id);

        const newKittyData = {
          id,
          genes: response.genes.toString(),
          birthTime: response.birthTime.toNumber(),
          dadId: response.dadId.toNumber(),
          momId: response.momId.toNumber(),
          generation: response.generation.toNumber(),
        };

        setKittyData(newKittyData);
        addKitty(newKittyData);
      } catch (error) {
        console.error(error);

        setHasError(true);
      } finally {
        setIsFetching(false);
      }
    },
    [id, kitties, kittyCore, addKitty]
  );

  useEffect(() => {
    loadKitty(kittyCore);
  }, [id, kittyCore]);

  return { isFetching, hasError, kittyData };
};

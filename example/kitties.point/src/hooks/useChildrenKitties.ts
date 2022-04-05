import { useState, useEffect } from "react";
import { useKittyCoreContract } from "./useContract";

export const useChildrenKitties = (kittyId: string | null) => {
  const [isFetching, setIsFetching] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [children, setChildren] = useState<number[]>([]);
  const kittyCore = useKittyCoreContract();

  // TODO: Combine with useFetch
  const loadChildrenIds = async () => {
    if (!kittyCore || kittyId == null) {
      return;
    }

    setHasError(false);
    setIsFetching(true);

    try {
      const children = await kittyCore.getChildren(kittyId);
      setChildren(children.map((bn: any) => bn.toString()));
    } catch (error) {
      console.error("Error in loadChildrenIds", error);
      setHasError(true);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadChildrenIds();
  }, [kittyCore, kittyId]);

  return { isFetching, hasError, children, loadChildrenIds };
};

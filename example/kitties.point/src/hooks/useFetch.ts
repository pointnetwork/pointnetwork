import { useEffect, useCallback, useState } from "react";
import { Contract } from "@ethersproject/contracts";

export const useFetch = <Response extends unknown>(
  contract: Contract | null,
  name: string,
  {
    fetchOnLoad = true,
    fetchOnLoadArgs = [],
  }: { fetchOnLoad?: boolean; fetchOnLoadArgs?: unknown[] } = {}
) => {
  const [hasError, setError] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [value, setValue] = useState<Response | null>(null);

  const fetch = useCallback(
    async (args: unknown[] = []) => {
      setIsFetching(true);
      setError(false);

      if (!contract) {
        setError(true);
        setIsFetching(false);
        return;
      }

      try {
        const response = await contract[name](...args);
        setValue(response);
      } catch (error) {
        setError(true);
        console.error(`Error while fetching "${name}"`, error);
      } finally {
        setIsFetching(false);
      }
    },
    [contract, name]
  );

  useEffect(() => {
    if (fetchOnLoad) {
      fetch(fetchOnLoadArgs);
    }
  }, []);

  return { fetch, value, isFetching, hasError };
};

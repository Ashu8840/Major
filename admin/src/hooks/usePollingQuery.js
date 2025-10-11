import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_INTERVAL = 30 * 1000;

const usePollingQuery = (key, queryFn, options = {}) => {
  const {
    enabled = true,
    refetchInterval = DEFAULT_INTERVAL,
    refetchOnWindowFocus = false,
    ...rest
  } = options;

  const query = useQuery({
    queryKey: key,
    queryFn,
    enabled,
    refetchInterval,
    refetchOnWindowFocus,
    ...rest,
  });

  useEffect(() => {
    if (!enabled) return;
    if (!refetchInterval) return;

    const interval = setInterval(() => {
      query.refetch();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enabled, refetchInterval, query]);

  return query;
};

export default usePollingQuery;

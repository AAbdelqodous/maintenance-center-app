import { useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { useGetDashboardSnapshotQuery } from '@/store/api/analyticsApi';
import type { DashboardSnapshot } from '@/types/dashboard';

export interface DashboardSnapshotResult {
  data: DashboardSnapshot | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

// Module-level flag: once the endpoint 404s, skip for the rest of the session.
// Resets on full page reload, which is fine — the backend may eventually ship the endpoint.
let snapshotEndpointUnavailable = false;

export function useDashboardSnapshot(): DashboardSnapshotResult {
  const isFocused = useIsFocused();
  const [skip, setSkip] = useState(snapshotEndpointUnavailable);

  const result = useGetDashboardSnapshotQuery(
    skip ? skipToken : undefined,
    {
      pollingInterval: isFocused && !skip ? 60_000 : 0,
      refetchOnFocus: !skip,
    }
  );

  useEffect(() => {
    if (result.isError) {
      snapshotEndpointUnavailable = true;
      setSkip(true);
    }
  }, [result.isError]);

  return {
    data: result.data,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: result.refetch,
  };
}

import { useIsFocused } from '@react-navigation/native';
import { useGetDashboardSnapshotQuery } from '@/store/api/analyticsApi';
import type { DashboardSnapshot } from '@/types/dashboard';

export interface DashboardSnapshotResult {
  data: DashboardSnapshot | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Wraps getDashboardSnapshot with focus-aware 60 s polling.
 * pollingInterval is set to 0 when the screen loses focus to prevent
 * background network requests and conserve battery/data.
 * refetchOnFocus triggers an immediate refresh when the screen re-enters focus.
 */
export function useDashboardSnapshot(): DashboardSnapshotResult {
  const isFocused = useIsFocused();

  const result = useGetDashboardSnapshotQuery(undefined, {
    pollingInterval: isFocused ? 60_000 : 0,
    refetchOnFocus: true,
  });

  return {
    data: result.data,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: result.refetch,
  };
}

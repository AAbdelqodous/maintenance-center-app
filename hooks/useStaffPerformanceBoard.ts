import { useIsFocused } from '@react-navigation/native';
import { useGetStaffPerformanceBoardQuery } from '@/store/api/analyticsApi';
import type { StaffPerformanceBoardResponse } from '@/types/staffPerformance';

export interface StaffPerformanceBoardResult {
  data: StaffPerformanceBoardResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useStaffPerformanceBoard(): StaffPerformanceBoardResult {
  const isFocused = useIsFocused();

  const result = useGetStaffPerformanceBoardQuery(undefined, {
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

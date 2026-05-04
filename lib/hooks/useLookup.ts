import { useTranslation } from 'react-i18next';
import { useGetLookupQuery } from '@/store/api/lookupsApi';
import type { LookupDetail, LookupMaster } from '@/types/lookup';

export interface UseLookupResult {
  /** Active values sorted by orderBy, ready to render */
  values: LookupDetail[];
  /** Resolve a shortName to a localized label; falls back to shortName if not found */
  getLabel: (shortName: string) => string;
  /** Find the full detail record for a shortName */
  getValue: (shortName: string) => LookupDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  master: LookupMaster | undefined;
}

export function useLookup(parameter: string): UseLookupResult {
  const { i18n } = useTranslation();
  const { data, isLoading, isError } = useGetLookupQuery(parameter, {
    skip: !parameter,
  });

  const values: LookupDetail[] = (data?.details ?? [])
    .filter((d) => d.status === 1)
    .sort((a, b) => (a.orderBy ?? 0) - (b.orderBy ?? 0));

  const getLabel = (shortName: string): string => {
    const detail = data?.details.find((d) => d.shortName === shortName);
    if (!detail) return shortName;
    return i18n.language === 'ar' ? detail.labelAr : detail.labelEn;
  };

  const getValue = (shortName: string): LookupDetail | undefined =>
    data?.details.find((d) => d.shortName === shortName);

  return { values, getLabel, getValue, isLoading, isError, master: data?.master };
}

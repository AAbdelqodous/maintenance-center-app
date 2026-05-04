export interface LookupMaster {
  mId: number;
  parameter: string;       // M_PARAMETER — e.g. "SERVICE_TYPE"
  itemName: string;        // ITEM_NAME — Arabic category display name
  privilegeLevel: number;
  moduleId: number;
}

export interface LookupDetail {
  id: number;
  mId: number;
  labelAr: string;         // PAR_AR
  labelEn: string;         // PAR_EN
  shortName: string;       // SHORT_NAME — the code to submit/store
  orderBy: number | null;
  status: number;          // 1 = active
}

export interface LookupCategory {
  master: LookupMaster;
  details: LookupDetail[];
}

// Known category parameters used in the app — matches M_PARAMETER values in DB
export const LOOKUP_PARAMS = {
  SERVICE_TYPE:     'SERVICE_TYPE',
  REJECTION_REASON: 'REJECTION_REASON',
  DISCOUNT_TYPE:    'DISCOUNT_TYPE',
} as const;

export type LookupParam = typeof LOOKUP_PARAMS[keyof typeof LOOKUP_PARAMS];

// shortName that indicates a free-text "other" reason
export const OTHER_SHORT_NAME = 'OTHER';

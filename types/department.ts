export interface Department {
  id: number;
  centerId: number;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
  isActive: boolean;
  categoryIds: number[];
  memberCount: number;
  // Spec 022 — at most one diagnostic dept per active center; gates the "no category"
  // booking flow and is the source of the diagnostic-fee rate captured at claim time.
  isDiagnostic: boolean;
  diagnosticFeeAmount: number | null;
}

export interface CreateDepartmentRequest {
  nameAr: string;
  nameEn: string;
  categoryIds?: number[];
  displayOrder?: number;
}

export interface UpdateDepartmentRequest {
  nameAr?: string;
  nameEn?: string;
  categoryIds?: number[];
  displayOrder?: number;
  isDiagnostic?: boolean;
  diagnosticFeeAmount?: number | null;
}

export interface DepartmentMembershipUpdate {
  membershipId: number;
}

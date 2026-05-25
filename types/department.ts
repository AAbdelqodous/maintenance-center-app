export interface Department {
  id: number;
  centerId: number;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
  isActive: boolean;
  categoryIds: number[];
  memberCount: number;
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
}

export interface DepartmentMembershipUpdate {
  membershipId: number;
}

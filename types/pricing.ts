// Re-export ServiceType so pricing components don't import directly from bookingsApi
export { ServiceType } from '../store/api/bookingsApi';

export interface CenterServicePricing {
  id: number;
  serviceType: ServiceType;
  serviceNameAr: string;
  serviceNameEn: string;
  minPrice: number;
  maxPrice: number;
  typicalDurationMinutes?: number;
  descriptionAr?: string;
  descriptionEn?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePricingRequest {
  serviceType: ServiceType;
  serviceNameAr: string;
  serviceNameEn: string;
  minPrice: number;
  maxPrice: number;
  typicalDurationMinutes?: number;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface UpdatePricingRequest extends CreatePricingRequest {
  isActive?: boolean;
}

export type TrustBadgeType =
  | 'VERIFIED_PRICING'
  | 'FAST_RESPONDER'
  | 'HIGH_COMPLETION'
  | 'TOP_RATED';

export interface TrustBadge {
  badgeType: TrustBadgeType;
  isEarned: boolean;
  earnedAt?: string;
  criteriaEn: string;
  criteriaAr: string;
}

export interface TrustSummary {
  badges: TrustBadge[];
}

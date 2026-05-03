export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type OfferStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface CenterOffer {
  id: number;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableServiceTypes: string[];
  startDate: string;
  endDate: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  status: OfferStatus;
  cancelledAt?: string;
  createdAt: string;
}

export interface CreateOfferRequest {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableServiceTypes?: string[];
  startDate: string;
  endDate: string;
  maxRedemptions?: number;
}

export type UpdateOfferRequest = CreateOfferRequest;

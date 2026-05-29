// Spec 024 — Quote Requests Inbox (owner side). Mirrors the shared `quoterequest` domain
// from customer spec 009; the center is given ONLY its own response (sealed). Prices are KD.

export type QuoteRequestStatus = 'OPEN' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export type QuoteResponseStatus =
  | 'NONE'
  | 'SUBMITTED'
  | 'UPDATED'
  | 'WITHDRAWN'
  | 'SELECTED'
  | 'NOT_SELECTED';

export type FulfillmentHint = 'DROP_OFF' | 'PICKUP_DELIVERY' | 'AT_HOME';

/** Inbox list row. */
export interface InboxItem {
  requestId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  descriptionPreview: string;
  areaGovernorate?: string;
  distance?: number;
  attachmentThumbUrls: string[];
  receivedAt: string;
  expiresAt: string;
  requestStatus: QuoteRequestStatus;
  myResponseStatus: QuoteResponseStatus;
}

/** This center's quote (the only response the center can see). */
export interface QuoteResponse {
  id: number;
  priceMin: number;
  priceMax: number;
  estimatedDurationMinutes?: number;
  inclusions?: string;
  message?: string;
  status: QuoteResponseStatus;
  submittedAt?: string;
  updatedAt?: string;
}

export interface QuoteRequestDetail {
  requestId: number;
  categoryId: number;
  categoryNameAr: string;
  categoryNameEn: string;
  serviceId?: number;
  description: string;
  attachmentUrls: string[];
  vehicleOrApplianceNote?: string;
  areaGovernorate?: string;
  distance?: number;
  fulfillmentHint?: FulfillmentHint;
  requestStatus: QuoteRequestStatus;
  expiresAt: string;
  /** This center's quote, or null if not yet quoted. */
  myResponse: QuoteResponse | null;
}

export interface SubmitQuoteRequest {
  priceMin: number;
  /** Equals priceMin for a fixed price. */
  priceMax: number;
  estimatedDurationMinutes?: number;
  inclusions?: string;
  message?: string;
}

export interface LeadPreferences {
  optedIn: boolean;
  categoryIds: number[];
  areaGovernorates: string[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface LeadMetrics {
  from: string;
  to: string;
  received: number;
  responded: number;
  won: number;
  winRate: number;
  avgResponseMinutes: number;
}

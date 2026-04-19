export interface QuoteLineItem {
  description: string;
  descriptionAr?: string;
  partsCost: number;
  laborCost: number;
}

export interface CreateQuoteRequest {
  lineItems: QuoteLineItem[];
  discountAmount?: number;
  discountReason?: string;
  estimatedDurationMinutes?: number;
  notes?: string;
  notesAr?: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'REVISED';

export interface BookingQuote {
  id: number;
  bookingId: number;
  version: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  discountAmount: number;
  discountReason?: string;
  taxAmount: number;
  totalAmount: number;
  estimatedDurationMinutes?: number;
  notes?: string;
  notesAr?: string;
  status: QuoteStatus;
  sentAt?: string;
  respondedAt?: string;
  responseNotes?: string;
  createdAt: string;
}

/**
 * Spec 022 line-item discriminator. `STANDARD` is the historic shape (parts + labor);
 * `DIAGNOSTIC_FEE` is the read-only fee row auto-injected on quotes for bookings whose
 * `passedThroughDiagnostic` is true. Backend prepends it; frontend must NOT edit/delete it.
 */
export type QuoteLineItemKind = 'STANDARD' | 'DIAGNOSTIC_FEE';

export interface QuoteLineItem {
  description: string;
  descriptionAr?: string;
  partsCost: number;
  laborCost: number;
  /** Defaults to STANDARD on legacy rows; backend sets DIAGNOSTIC_FEE on the locked row. */
  kind?: QuoteLineItemKind;
  /** i18n key used when the row's label is localized server-side (e.g. diagnostic fee). */
  descriptionKey?: string;
  /** When false, the frontend MUST NOT render edit affordances for this line. */
  editable?: boolean;
  /** When false, the frontend MUST NOT render delete affordances for this line. */
  removable?: boolean;
  /** Spec 025 — catalogued part ref; backend snapshots salePrice×quantity into partsCost. */
  partId?: number;
  /** Spec 025 — units of the catalogued part (defaults to 1). */
  quantity?: number;
  /** Spec 025 — one-off part not in the catalog (priced on the quote, no stock effect). */
  adHoc?: boolean;
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

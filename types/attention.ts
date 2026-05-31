export type AttentionCategory =
  | 'OVERDUE_BOOKING'
  | 'STALLED_BOOKING'
  | 'UNASSIGNED_BOOKING'
  | 'PENDING_QUOTE'
  | 'NEW_QUOTE_REQUEST'
  | 'LOW_RATED_REVIEW'
  | 'UNANSWERED_CHAT'
  // Spec 025 — a catalogued part at/below its reorder threshold.
  | 'LOW_STOCK';

export type AttentionSeverity = 'HIGH' | 'MEDIUM';

export interface AttentionItem {
  id: string;
  category: AttentionCategory;
  severity: AttentionSeverity;
  title: string;
  subtitle: string;
  occurredAt: Date;
  sourceId: number;
  navigateTo: string;
}

export const ATTENTION_CATEGORY_ORDER: AttentionCategory[] = [
  'OVERDUE_BOOKING',
  'STALLED_BOOKING',
  'UNASSIGNED_BOOKING',
  'NEW_QUOTE_REQUEST',
  'LOW_STOCK',
  'LOW_RATED_REVIEW',
  'UNANSWERED_CHAT',
];

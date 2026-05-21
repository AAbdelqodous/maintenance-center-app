export type AttentionCategory =
  | 'OVERDUE_BOOKING'
  | 'STALLED_BOOKING'
  | 'UNASSIGNED_BOOKING'
  | 'PENDING_QUOTE'
  | 'LOW_RATED_REVIEW'
  | 'UNANSWERED_CHAT';

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
  'LOW_RATED_REVIEW',
  'UNANSWERED_CHAT',
];

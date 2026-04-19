export type WorkStage =
  | 'RECEIVED' | 'DIAGNOSING' | 'QUOTE_READY' | 'QUOTE_APPROVED' | 'QUOTE_REJECTED'
  | 'PARTS_ORDERED' | 'PARTS_RECEIVED' | 'WORK_IN_PROGRESS' | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP' | 'PICKED_UP';

export interface WorkStageInfo {
  stage: WorkStage;
  displayNameAr: string;
  displayNameEn: string;
  order: number;
  canTransitionTo: WorkStage[];
}

export const WORK_STAGES: WorkStageInfo[] = [
  { stage: 'RECEIVED',         displayNameAr: 'تم استلام السيارة',   displayNameEn: 'Car Received',       order: 1,  canTransitionTo: ['DIAGNOSING'] },
  { stage: 'DIAGNOSING',       displayNameAr: 'جاري الفحص',          displayNameEn: 'Diagnosing',          order: 2,  canTransitionTo: ['QUOTE_READY'] },
  { stage: 'QUOTE_READY',      displayNameAr: 'عرض السعر جاهز',      displayNameEn: 'Quote Ready',         order: 3,  canTransitionTo: ['QUOTE_APPROVED', 'QUOTE_REJECTED'] },
  { stage: 'QUOTE_APPROVED',   displayNameAr: 'تمت الموافقة',         displayNameEn: 'Quote Approved',      order: 4,  canTransitionTo: ['PARTS_ORDERED', 'WORK_IN_PROGRESS'] },
  { stage: 'QUOTE_REJECTED',   displayNameAr: 'تم الرفض',             displayNameEn: 'Quote Rejected',      order: 5,  canTransitionTo: ['PARTS_ORDERED', 'WORK_IN_PROGRESS'] },
  { stage: 'PARTS_ORDERED',    displayNameAr: 'تم طلب القطع',         displayNameEn: 'Parts Ordered',       order: 6,  canTransitionTo: ['PARTS_RECEIVED'] },
  { stage: 'PARTS_RECEIVED',   displayNameAr: 'وصلت القطع',           displayNameEn: 'Parts Received',      order: 7,  canTransitionTo: ['WORK_IN_PROGRESS'] },
  { stage: 'WORK_IN_PROGRESS', displayNameAr: 'جاري العمل',           displayNameEn: 'Work In Progress',    order: 8,  canTransitionTo: ['QUALITY_CHECK'] },
  { stage: 'QUALITY_CHECK',    displayNameAr: 'فحص الجودة',           displayNameEn: 'Quality Check',       order: 9,  canTransitionTo: ['READY_FOR_PICKUP', 'WORK_IN_PROGRESS'] },
  { stage: 'READY_FOR_PICKUP', displayNameAr: 'جاهز للاستلام',        displayNameEn: 'Ready for Pickup',    order: 10, canTransitionTo: ['PICKED_UP'] },
  { stage: 'PICKED_UP',        displayNameAr: 'تم الاستلام',          displayNameEn: 'Picked Up',           order: 11, canTransitionTo: [] },
];

export interface UpdateWorkStageRequest {
  stage: WorkStage;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  estimatedMinutesRemaining?: number;
}

export interface BookingWorkProgress {
  id: number;
  stage: WorkStage;
  notes?: string;
  notesAr?: string;
  internalNotes?: string;
  photoUrl?: string;
  videoUrl?: string;
  estimatedMinutesRemaining?: number;
  createdAt: string;
  createdByName?: string;
}

export type MediaCategory =
  | 'VEHICLE_ARRIVAL' | 'ISSUE_FOUND' | 'PARTS_USED' | 'WORK_IN_PROGRESS'
  | 'BEFORE_REPAIR' | 'AFTER_REPAIR' | 'QUALITY_CHECK' | 'CUSTOMER_PICKUP';

export interface BookingMedia {
  id: number;
  mediaType: 'PHOTO' | 'VIDEO';
  category: MediaCategory;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  captionAr?: string;
  isVisibleToCustomer: boolean;
  createdAt: string;
}

export function getAvailableNextStages(currentStage: WorkStage): WorkStageInfo[] {
  const current = WORK_STAGES.find(s => s.stage === currentStage);
  if (!current || current.canTransitionTo.length === 0) return [];
  return current.canTransitionTo.map(
    next => WORK_STAGES.find(s => s.stage === next)!
  );
}

export function getStageDisplayName(stage: WorkStage, locale: string): string {
  const info = WORK_STAGES.find(s => s.stage === stage);
  if (!info) return stage;
  return locale === 'ar' ? info.displayNameAr : info.displayNameEn;
}

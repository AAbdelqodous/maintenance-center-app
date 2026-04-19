# Data Model: Phase 4.0 — Work Progress & Quotes

**Branch**: `003-work-progress-quotes` | **Date**: 2026-04-16

---

## TypeScript Types — `types/workProgress.ts`

The full type and constant set is specified in CLAUDE.md Phase 4.0 section. Create the file with this exact content:

```typescript
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
  { stage: 'PARTS_ORDERED',    displayNameAr: 'تم طلب القطع',         displayNameEn: 'Parts Ordered',       order: 5,  canTransitionTo: ['PARTS_RECEIVED'] },
  { stage: 'PARTS_RECEIVED',   displayNameAr: 'وصلت القطع',           displayNameEn: 'Parts Received',      order: 6,  canTransitionTo: ['WORK_IN_PROGRESS'] },
  { stage: 'WORK_IN_PROGRESS', displayNameAr: 'جاري العمل',           displayNameEn: 'Work In Progress',    order: 7,  canTransitionTo: ['QUALITY_CHECK'] },
  { stage: 'QUALITY_CHECK',    displayNameAr: 'فحص الجودة',           displayNameEn: 'Quality Check',       order: 8,  canTransitionTo: ['READY_FOR_PICKUP', 'WORK_IN_PROGRESS'] },
  { stage: 'READY_FOR_PICKUP', displayNameAr: 'جاهز للاستلام',        displayNameEn: 'Ready for Pickup',    order: 9,  canTransitionTo: ['PICKED_UP'] },
  { stage: 'PICKED_UP',        displayNameAr: 'تم الاستلام',          displayNameEn: 'Picked Up',           order: 10, canTransitionTo: [] },
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
  internalNotes?: string;  // Only visible to center
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

// Helper: derive available next stages from current stage
export function getAvailableNextStages(currentStage: WorkStage): WorkStageInfo[] {
  const current = WORK_STAGES.find(s => s.stage === currentStage);
  if (!current || current.canTransitionTo.length === 0) return [];
  return current.canTransitionTo.map(
    next => WORK_STAGES.find(s => s.stage === next)!
  );
}

// Helper: display name for a stage given locale
export function getStageDisplayName(stage: WorkStage, locale: string): string {
  const info = WORK_STAGES.find(s => s.stage === stage);
  if (!info) return stage;
  return locale === 'ar' ? info.displayNameAr : info.displayNameEn;
}
```

---

## TypeScript Types — `types/quote.ts`

```typescript
export interface QuoteLineItem {
  description: string;
  descriptionAr?: string;
  partsCost: number;    // KD, 3 decimal places
  laborCost: number;    // KD, 3 decimal places
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
  subtotal: number;        // Sum of all (partsCost + laborCost)
  discountAmount: number;  // 0 if no discount
  discountReason?: string;
  taxAmount: number;       // Computed server-side
  totalAmount: number;     // subtotal - discountAmount + taxAmount
  estimatedDurationMinutes?: number;
  notes?: string;
  notesAr?: string;
  status: QuoteStatus;
  sentAt?: string;
  respondedAt?: string;
  responseNotes?: string;
  createdAt: string;
}
```

---

## Zod Schemas

### `components/progress/progressSchema.ts`

```typescript
import { z } from 'zod';
import { WorkStage } from '../../types/workProgress';

export const stageUpdateSchema = z.object({
  stage: z.nativeEnum({ ...Object.fromEntries(
    ['RECEIVED','DIAGNOSING','QUOTE_READY','QUOTE_APPROVED','QUOTE_REJECTED',
     'PARTS_ORDERED','PARTS_RECEIVED','WORK_IN_PROGRESS','QUALITY_CHECK',
     'READY_FOR_PICKUP','PICKED_UP'].map(s => [s, s])
  ) } as Record<WorkStage, WorkStage>),
  notes: z.string().max(500).optional(),
  notesAr: z.string().max(500).optional(),
  internalNotes: z.string().optional(),
  estimatedMinutesRemaining: z.number().int().min(1).optional(),
});

export const progressUpdateSchema = z.object({
  notes: z.string().max(500).optional(),
  internalNotes: z.string().optional(),
  // photos handled separately via FileSystem.uploadAsync (not form fields)
});

export type ProgressUpdateFormValues = z.infer<typeof progressUpdateSchema>;
```

**Note**: For `stageUpdateSchema`, use `z.enum([...] as const)` pattern, passing the stage string array directly. The above uses an object pattern — adjust if TypeScript inference differs.

### `components/quotes/quoteSchema.ts`

```typescript
import { z } from 'zod';

const lineItemSchema = z.object({
  description:  z.string().min(1, 'Description is required'),
  descriptionAr: z.string().optional(),
  partsCost:    z.number({ invalid_type_error: 'Parts cost required' }).min(0),
  laborCost:    z.number({ invalid_type_error: 'Labor cost required' }).min(0),
});

export const quoteSchema = z.object({
  lineItems:                z.array(lineItemSchema).min(1, 'At least one line item is required'),
  discountAmount:           z.number().min(0).optional(),
  discountReason:           z.string().optional(),
  estimatedDurationMinutes: z.number().int().min(1).optional(),
  notes:                    z.string().optional(),
  notesAr:                  z.string().optional(),
}).refine(
  (data) => {
    if (!data.discountAmount || data.discountAmount === 0) return true;
    const subtotal = data.lineItems.reduce(
      (sum, item) => sum + item.partsCost + item.laborCost, 0
    );
    return data.discountAmount <= subtotal;
  },
  { message: 'Discount cannot exceed the subtotal', path: ['discountAmount'] }
);

export type QuoteFormValues = z.infer<typeof quoteSchema>;
```

---

## RTK Query Slice — `store/api/workProgressApi.ts`

```typescript
import { baseApi } from './baseApi';
import type {
  BookingWorkProgress,
  BookingMedia,
  UpdateWorkStageRequest,
} from '../../types/workProgress';

export const workProgressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateWorkStage: builder.mutation<void, { bookingId: number; data: UpdateWorkStageRequest }>({
      query: ({ bookingId, data }) => ({
        url: `bookings/${bookingId}/work-stage`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['WorkProgress', 'Bookings'],
    }),
    getWorkProgress: builder.query<BookingWorkProgress[], number>({
      query: (bookingId) => `bookings/${bookingId}/work-progress`,
      providesTags: ['WorkProgress'],
    }),
    createWorkProgress: builder.mutation<BookingWorkProgress, { bookingId: number; notes?: string; internalNotes?: string; estimatedMinutesRemaining?: number }>({
      query: ({ bookingId, ...body }) => ({
        url: `bookings/${bookingId}/work-progress`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WorkProgress'],
    }),
    getBookingMedia: builder.query<BookingMedia[], number>({
      query: (bookingId) => `bookings/${bookingId}/media`,
      providesTags: ['WorkProgress'],
    }),
    // Note: Photo upload uses FileSystem.uploadAsync for per-photo progress tracking.
    // The uploadMedia mutation is used only for metadata or fallback (no progress needed):
    uploadMedia: builder.mutation<BookingMedia, { bookingId: number; formData: FormData }>({
      query: ({ bookingId, formData }) => ({
        url: `bookings/${bookingId}/media`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['WorkProgress'],
    }),
  }),
});

export const {
  useUpdateWorkStageMutation,
  useGetWorkProgressQuery,
  useCreateWorkProgressMutation,
  useGetBookingMediaQuery,
  useUploadMediaMutation,
} = workProgressApi;
```

---

## RTK Query Slice — `store/api/quotesApi.ts`

```typescript
import { baseApi } from './baseApi';
import type { BookingQuote, CreateQuoteRequest } from '../../types/quote';

export const quotesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBookingQuotes: builder.query<BookingQuote[], number>({
      query: (bookingId) => `bookings/${bookingId}/quotes`,
      providesTags: ['Quotes'],
    }),
    createQuote: builder.mutation<BookingQuote, { bookingId: number; data: CreateQuoteRequest }>({
      query: ({ bookingId, data }) => ({
        url: `bookings/${bookingId}/quotes`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Quotes'],
    }),
    sendQuote: builder.mutation<BookingQuote, { bookingId: number; quoteId: number }>({
      query: ({ bookingId, quoteId }) => ({
        url: `bookings/${bookingId}/quotes/${quoteId}/send`,
        method: 'POST',
      }),
      invalidatesTags: ['Quotes'],
    }),
  }),
});

export const {
  useGetBookingQuotesQuery,
  useCreateQuoteMutation,
  useSendQuoteMutation,
} = quotesApi;
```

---

## i18n Keys

Add to both `lib/i18n/locales/en.json` and `ar.json`. Keys follow CLAUDE.md Phase 4.0 section with additions for new screens.

### English (`en.json` additions)

```json
"progress": {
  "title": "Work Progress",
  "updateStage": "Update Stage",
  "currentStage": "Current Stage",
  "addUpdate": "Add Update",
  "notes": "Notes for customer",
  "internalNotes": "Internal notes (not visible to customer)",
  "internalOnly": "Internal only",
  "uploadPhotos": "Add Photo",
  "gallery": "Gallery",
  "camera": "Camera",
  "estimatedTime": "Estimated time remaining (minutes)",
  "maxPhotos": "Maximum 5 photos reached",
  "photoTooLarge": "Photo is too large. Maximum size is 10 MB per photo.",
  "saved": "Progress update saved",
  "errorSave": "Failed to save progress update",
  "errorLoad": "Could not load progress. Tap to retry.",
  "noEntries": "No progress updates yet. Add the first update to keep your customer informed.",
  "selectStage": "Select next stage",
  "stageUpdated": "Stage updated successfully",
  "errorStageUpdate": "Failed to update stage",
  "confirmStageTitle": "Update Stage",
  "confirmStageMessage": "Update to this stage?",
  "notesForCustomer": "Note for customer (optional)",
  "confirmSend": "Confirm",
  "uploadProgress": "Uploading...",
  "uploadError": "Upload failed. Tap to retry.",
  "tabDetails": "Details",
  "tabProgress": "Progress",
  "tabQuotes": "Quotes"
},
"workStage": {
  "RECEIVED": "Car Received",
  "DIAGNOSING": "Diagnosing",
  "QUOTE_READY": "Quote Ready",
  "QUOTE_APPROVED": "Quote Approved",
  "QUOTE_REJECTED": "Quote Rejected",
  "PARTS_ORDERED": "Parts Ordered",
  "PARTS_RECEIVED": "Parts Received",
  "WORK_IN_PROGRESS": "Work In Progress",
  "QUALITY_CHECK": "Quality Check",
  "READY_FOR_PICKUP": "Ready for Pickup",
  "PICKED_UP": "Picked Up"
},
"quote": {
  "title": "Quotes",
  "createQuote": "Create Quote",
  "lineItems": "Line Items",
  "description": "Service Description",
  "descriptionAr": "Arabic Description (optional)",
  "partsCost": "Parts Cost (KD)",
  "laborCost": "Labor Cost (KD)",
  "addLineItem": "Add Line Item",
  "removeLineItem": "Remove",
  "subtotal": "Subtotal",
  "discount": "Discount (KD)",
  "discountReason": "Discount Reason",
  "tax": "Tax",
  "total": "Total",
  "estimatedDuration": "Estimated Duration (minutes)",
  "notes": "Notes for customer",
  "notesAr": "Arabic Notes",
  "saveAsDraft": "Save as Draft",
  "sendToCustomer": "Send to Customer",
  "quoteSent": "Quote sent successfully",
  "errorSave": "Failed to save quote",
  "errorSend": "Failed to send quote",
  "errorLoad": "Could not load quotes",
  "noQuotes": "No quotes yet. Create a quote to share your pricing with the customer.",
  "draft": "Draft",
  "sent": "Sent",
  "approved": "Approved",
  "rejected": "Rejected",
  "revised": "Revised",
  "confirmSendTitle": "Send Quote",
  "confirmSendMessage": "Are you sure you want to send this quote to the customer?",
  "confirmSendWeb": "Send this quote to the customer?",
  "createRevised": "Create Revised Quote",
  "version": "Version",
  "respondedAt": "Customer responded",
  "responseNotes": "Customer notes",
  "discountError": "Discount cannot exceed the subtotal"
}
```

### Arabic (`ar.json` additions)

```json
"progress": {
  "title": "تقدم العمل",
  "updateStage": "تحديث المرحلة",
  "currentStage": "المرحلة الحالية",
  "addUpdate": "إضافة تحديث",
  "notes": "ملاحظات للعميل",
  "internalNotes": "ملاحظات داخلية (غير مرئية للعميل)",
  "internalOnly": "داخلي فقط",
  "uploadPhotos": "إضافة صورة",
  "gallery": "المعرض",
  "camera": "الكاميرا",
  "estimatedTime": "الوقت المتبقي المقدر (دقائق)",
  "maxPhotos": "الحد الأقصى 5 صور",
  "photoTooLarge": "الصورة كبيرة جداً. الحجم الأقصى 10 ميغابايت لكل صورة.",
  "saved": "تم حفظ التحديث",
  "errorSave": "فشل حفظ التحديث",
  "errorLoad": "تعذّر تحميل التقدم. اضغط للمحاولة.",
  "noEntries": "لا توجد تحديثات بعد. أضف أول تحديث لإبقاء عميلك على اطلاع.",
  "selectStage": "اختر المرحلة التالية",
  "stageUpdated": "تم تحديث المرحلة بنجاح",
  "errorStageUpdate": "فشل تحديث المرحلة",
  "confirmStageTitle": "تحديث المرحلة",
  "confirmStageMessage": "هل تريد التحديث إلى هذه المرحلة؟",
  "notesForCustomer": "ملاحظة للعميل (اختياري)",
  "confirmSend": "تأكيد",
  "uploadProgress": "جاري الرفع...",
  "uploadError": "فشل الرفع. اضغط للمحاولة.",
  "tabDetails": "التفاصيل",
  "tabProgress": "التقدم",
  "tabQuotes": "العروض"
},
"workStage": {
  "RECEIVED": "تم استلام السيارة",
  "DIAGNOSING": "جاري الفحص",
  "QUOTE_READY": "عرض السعر جاهز",
  "QUOTE_APPROVED": "تمت الموافقة",
  "QUOTE_REJECTED": "تم الرفض",
  "PARTS_ORDERED": "تم طلب القطع",
  "PARTS_RECEIVED": "وصلت القطع",
  "WORK_IN_PROGRESS": "جاري العمل",
  "QUALITY_CHECK": "فحص الجودة",
  "READY_FOR_PICKUP": "جاهز للاستلام",
  "PICKED_UP": "تم الاستلام"
},
"quote": {
  "title": "العروض",
  "createQuote": "إنشاء عرض",
  "lineItems": "بنود الخدمة",
  "description": "وصف الخدمة",
  "descriptionAr": "الوصف بالعربية (اختياري)",
  "partsCost": "تكلفة القطع (د.ك)",
  "laborCost": "تكلفة العمل (د.ك)",
  "addLineItem": "إضافة بند",
  "removeLineItem": "حذف",
  "subtotal": "المجموع الجزئي",
  "discount": "الخصم (د.ك)",
  "discountReason": "سبب الخصم",
  "tax": "الضريبة",
  "total": "الإجمالي",
  "estimatedDuration": "المدة المقدرة (دقائق)",
  "notes": "ملاحظات للعميل",
  "notesAr": "الملاحظات بالعربية",
  "saveAsDraft": "حفظ كمسودة",
  "sendToCustomer": "إرسال للعميل",
  "quoteSent": "تم إرسال العرض بنجاح",
  "errorSave": "فشل حفظ العرض",
  "errorSend": "فشل إرسال العرض",
  "errorLoad": "تعذّر تحميل العروض",
  "noQuotes": "لا توجد عروض بعد. أنشئ عرضاً لمشاركة الأسعار مع العميل.",
  "draft": "مسودة",
  "sent": "مُرسَل",
  "approved": "موافق عليه",
  "rejected": "مرفوض",
  "revised": "معدّل",
  "confirmSendTitle": "إرسال العرض",
  "confirmSendMessage": "هل تريد إرسال هذا العرض للعميل؟",
  "confirmSendWeb": "هل تريد إرسال هذا العرض للعميل؟",
  "createRevised": "إنشاء عرض معدّل",
  "version": "الإصدار",
  "respondedAt": "رد العميل",
  "responseNotes": "ملاحظات العميل",
  "discountError": "الخصم لا يمكن أن يتجاوز المجموع الجزئي"
}
```

---

## Screen & Component Map

| Screen / Component | Path | Type | Story |
|--------------------|------|------|-------|
| Booking detail (modified) | `app/(app)/(tabs)/bookings/[id].tsx` | MODIFY | US1+US3 |
| Add Progress screen | `app/(app)/(tabs)/bookings/add-progress.tsx` | NEW Screen | US2 |
| Quote Detail screen | `app/(app)/(tabs)/bookings/quote-detail.tsx` | NEW Screen | US5 |
| Create Quote screen | `app/(app)/(tabs)/bookings/create-quote.tsx` | NEW Screen | US4 |
| WorkStageSelector | `components/bookings/WorkStageSelector.tsx` | Component | US1 |
| StageUpdateForm | `components/progress/StageUpdateForm.tsx` | Component | US1 |
| PhotoUploader | `components/progress/PhotoUploader.tsx` | Component | US2 |
| ProgressTimeline | `components/progress/ProgressTimeline.tsx` | Component | US3 |
| QuoteBuilder | `components/quotes/QuoteBuilder.tsx` | Component | US4 |
| QuoteCard | `components/quotes/QuoteCard.tsx` | Component | US4+US5 |
| Zod stage schema | `components/progress/progressSchema.ts` | Util | US1 |
| Zod quote schema | `components/quotes/quoteSchema.ts` | Util | US4 |
| Work progress types | `types/workProgress.ts` | Types | All |
| Quote types | `types/quote.ts` | Types | US4+US5 |
| Work progress RTK | `store/api/workProgressApi.ts` | Store | US1+US2+US3 |
| Quotes RTK | `store/api/quotesApi.ts` | Store | US4+US5 |
| i18n en | `lib/i18n/locales/en.json` | i18n | All |
| i18n ar | `lib/i18n/locales/ar.json` | i18n | All |
| Bookings stack layout | `app/(app)/(tabs)/bookings/_layout.tsx` | MODIFY | All |

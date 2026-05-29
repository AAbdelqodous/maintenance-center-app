// Spec 024 — dependency-free in-memory mock backend for the quote-requests inbox.
// Used only when EXPO_PUBLIC_USE_MOCKS=true (see quoteRequestsApi). No MSW / no new deps:
// the center app has no jest harness and a clean Expo 54 tree we don't want to perturb.
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type {
  InboxItem,
  LeadMetrics,
  LeadPreferences,
  QuoteRequestDetail,
  QuoteResponse,
  SubmitQuoteRequest,
} from '@/types/quoteRequests';

let nextResponseId = 6000;
let nextConversationId = 880;

const EXPIRES_AT = new Date(Date.now() + 47 * 3600_000).toISOString();

// Seeded matching requests for this center (what the backend matcher would return).
const details: Record<number, QuoteRequestDetail> = {
  901: {
    requestId: 901,
    categoryId: 1,
    categoryNameEn: 'AC',
    categoryNameAr: 'تكييف',
    description: 'AC not cold, started last week. Blows warm air on the highway.',
    attachmentUrls: [],
    vehicleOrApplianceNote: '2018 Toyota Camry',
    areaGovernorate: 'Hawalli',
    distance: 3.2,
    fulfillmentHint: 'PICKUP_DELIVERY',
    requestStatus: 'OPEN',
    expiresAt: EXPIRES_AT,
    myResponse: null,
  },
  902: {
    requestId: 902,
    categoryId: 2,
    categoryNameEn: 'Brakes',
    categoryNameAr: 'الفرامل',
    description: 'Squealing noise when braking, want an inspection + pads if needed.',
    attachmentUrls: [],
    areaGovernorate: 'Salmiya',
    distance: 6.1,
    requestStatus: 'OPEN',
    expiresAt: EXPIRES_AT,
    myResponse: null,
  },
};

let prefs: LeadPreferences = {
  optedIn: true,
  categoryIds: [1, 2, 3],
  areaGovernorates: ['Hawalli', 'Salmiya', 'Capital'],
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const metrics: LeadMetrics = {
  from: '2026-05-01',
  to: '2026-05-29',
  received: 40,
  responded: 28,
  won: 9,
  winRate: 0.321,
  avgResponseMinutes: 24,
};

function toInbox(d: QuoteRequestDetail): InboxItem {
  return {
    requestId: d.requestId,
    categoryNameAr: d.categoryNameAr,
    categoryNameEn: d.categoryNameEn,
    descriptionPreview: d.description.length > 80 ? `${d.description.slice(0, 80)}…` : d.description,
    areaGovernorate: d.areaGovernorate,
    distance: d.distance,
    attachmentThumbUrls: d.attachmentUrls,
    receivedAt: new Date(Date.now() - 3600_000).toISOString(),
    expiresAt: d.expiresAt,
    requestStatus: d.requestStatus,
    myResponseStatus: d.myResponse?.status ?? 'NONE',
  };
}

type Result = { data: unknown } | { error: FetchBaseQueryError };
const ok = (data: unknown): Result => ({ data });
const err = (status: number): Result => ({ error: { status, data: undefined } as FetchBaseQueryError });

function handle(url: string, method: string, body: any): Result {
  // GET centers/my/quote-requests
  if (url === 'centers/my/quote-requests' && method === 'GET') {
    return ok(Object.values(details).map(toInbox));
  }
  // GET|PUT centers/my/lead-preferences
  if (url === 'centers/my/lead-preferences') {
    if (method === 'PUT') {
      prefs = { ...prefs, ...(body as Partial<LeadPreferences>) };
      return ok(prefs);
    }
    return ok(prefs);
  }
  // GET centers/my/lead-metrics
  if (url === 'centers/my/lead-metrics' && method === 'GET') {
    return ok(metrics);
  }

  const quoteMatch = url.match(/^quote-requests\/(\d+)\/quote$/);
  if (quoteMatch) {
    const d = details[Number(quoteMatch[1])];
    if (!d) return err(404);
    if (method === 'POST') {
      if (d.requestStatus !== 'OPEN') return err(409);
      const input = body as SubmitQuoteRequest;
      const now = new Date().toISOString();
      const existing = d.myResponse;
      const response: QuoteResponse = {
        id: existing?.id ?? nextResponseId++,
        priceMin: input.priceMin,
        priceMax: input.priceMax,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        inclusions: input.inclusions,
        message: input.message,
        status: existing ? 'UPDATED' : 'SUBMITTED',
        submittedAt: existing?.submittedAt ?? now,
        updatedAt: existing ? now : undefined,
      };
      d.myResponse = response;
      return ok(response);
    }
    if (method === 'DELETE') {
      if (!d.myResponse || d.myResponse.status === 'SELECTED') return err(409);
      d.myResponse = { ...d.myResponse, status: 'WITHDRAWN' };
      return ok({ id: d.myResponse.id, status: 'WITHDRAWN' });
    }
  }

  const chatMatch = url.match(/^quote-requests\/(\d+)\/chat$/);
  if (chatMatch && method === 'POST') {
    return ok({ conversationId: nextConversationId++ });
  }

  const detailMatch = url.match(/^quote-requests\/(\d+)$/);
  if (detailMatch && method === 'GET') {
    const d = details[Number(detailMatch[1])];
    return d ? ok(d) : err(404);
  }

  return err(404);
}

export const quoteRequestsMockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args) => {
    const url = typeof args === 'string' ? args : args.url;
    const method = (typeof args === 'string' ? 'GET' : args.method ?? 'GET').toUpperCase();
    const body = typeof args === 'string' ? undefined : args.body;
    // small latency so loading states are visible in the demo
    await new Promise((r) => setTimeout(r, 250));
    return handle(url.replace(/^\//, ''), method, body) as
      | { data: unknown }
      | { error: FetchBaseQueryError };
  };

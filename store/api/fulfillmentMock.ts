// Spec 008 — dependency-free in-memory mock for the center fulfillment domain (advance a booking's
// logistics leg). Used only when EXPO_PUBLIC_USE_MOCKS=true (see fulfillmentApi). No MSW / no new
// deps — mirrors the centerPaymentsMock approach (the center app has no jest harness).
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type {
  AdvanceLogisticsRequest,
  CenterFulfillmentCapability,
  LogisticsStatus,
  UpdateCapabilityRequest,
} from '@/types/fulfillment';
import { LOGISTICS_STATES } from '@/types/fulfillment';

// Per-booking demo state. Defaults to a pickup booking at its first leg so the advance button works
// without a backend; a real booking's mode/state comes from the booking detail in non-mock mode.
const state = new Map<number, { mode: 'PICKUP_DELIVERY' | 'AT_HOME'; index: number }>();

type Result = { data: unknown } | { error: FetchBaseQueryError };
const ok = (data: unknown): Result => ({ data });
const fail = (status: number, message?: string): Result => ({
  error: { status, data: message ? { businessErrorDescription: message } : undefined } as FetchBaseQueryError,
});

function buildStatus(bookingId: number): LogisticsStatus {
  const entry = state.get(bookingId) ?? { mode: 'PICKUP_DELIVERY' as const, index: 0 };
  state.set(bookingId, entry);
  const legs = LOGISTICS_STATES[entry.mode];
  return {
    bookingId,
    mode: entry.mode,
    currentState: legs[entry.index],
    etaText: entry.index < legs.length - 1 ? '~30 min' : null,
    declined: false,
    declineReason: null,
    legs,
    updatedAt: new Date().toISOString(),
  };
}

// In-memory authored capability (defaults mirror the backend platform default).
let capability: CenterFulfillmentCapability = {
  centerId: 1,
  serviceId: null,
  supportedModes: ['DROP_OFF', 'PICKUP_DELIVERY', 'AT_HOME'],
  serviceAreaGovernorates: ['Hawalli', 'Salmiya', 'Capital', 'Farwaniya'],
  feeByMode: {
    DROP_OFF: { type: 'FLAT', flatAmount: 0 },
    PICKUP_DELIVERY: { type: 'PER_KM', baseAmount: 3.0, perKm: 0.25 },
    AT_HOME: { type: 'FLAT', flatAmount: 5.0 },
  },
  centerLat: 29.333,
  centerLng: 48.0,
};

function buildCapability(req: UpdateCapabilityRequest): CenterFulfillmentCapability {
  const modes = ['DROP_OFF', ...req.supportedModes.filter((m) => m === 'PICKUP_DELIVERY' || m === 'AT_HOME')];
  const feeByMode: CenterFulfillmentCapability['feeByMode'] = {};
  for (const m of modes) {
    if (m === 'DROP_OFF') feeByMode[m] = { type: 'FLAT', flatAmount: 0 };
    else if (m === 'PICKUP_DELIVERY') feeByMode[m] = { type: 'PER_KM', baseAmount: req.pickupBase ?? 3.0, perKm: req.pickupPerKm ?? 0.25 };
    else if (m === 'AT_HOME') feeByMode[m] = { type: 'FLAT', flatAmount: req.atHomeFlat ?? 5.0 };
  }
  return { ...capability, supportedModes: modes, serviceAreaGovernorates: req.serviceAreaGovernorates ?? [], feeByMode };
}

function handle(url: string, method: string, body: any): Result {
  // GET|PUT centers/my/fulfillment
  if (url === 'centers/my/fulfillment') {
    if (method === 'PUT') {
      capability = buildCapability(body as UpdateCapabilityRequest);
      return ok(capability);
    }
    return ok(capability);
  }

  // POST centers/my/bookings/{id}/logistics/advance
  const advanceMatch = url.match(/^centers\/my\/bookings\/(\d+)\/logistics\/advance$/);
  if (advanceMatch && method === 'POST') {
    const bookingId = Number(advanceMatch[1]);
    const entry = state.get(bookingId) ?? { mode: 'PICKUP_DELIVERY' as const, index: 0 };
    const legs = LOGISTICS_STATES[entry.mode];
    const target = (body as AdvanceLogisticsRequest | undefined)?.targetState;
    if (target) {
      const idx = legs.indexOf(target);
      if (idx < 0) return fail(400, 'Unknown logistics state for this mode');
      if (idx <= entry.index) return fail(400, 'Logistics can only move forward');
      entry.index = idx;
    } else {
      if (entry.index >= legs.length - 1) return fail(409, 'Already at the final logistics leg');
      entry.index += 1;
    }
    state.set(bookingId, entry);
    return ok(buildStatus(bookingId));
  }
  return fail(404);
}

export const fulfillmentMockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args) => {
    const url = typeof args === 'string' ? args : args.url;
    const method = (typeof args === 'string' ? 'GET' : args.method ?? 'GET').toUpperCase();
    const body = typeof args === 'string' ? undefined : args.body;
    await new Promise((r) => setTimeout(r, 250)); // visible loading states for the demo
    return handle(url.replace(/^\//, ''), method, body) as
      | { data: unknown }
      | { error: FetchBaseQueryError };
  };

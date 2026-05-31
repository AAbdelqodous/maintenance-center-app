// Spec 008 — pickup & delivery / at-home fulfillment (center side). The center drives the logistics
// legs; the backend is authoritative for the ordered sequence (returned as `legs` on every response).
export type FulfillmentMode = 'DROP_OFF' | 'PICKUP_DELIVERY' | 'AT_HOME';

// Ordered logistics legs per mode — mirrors the backend FulfillmentService. Used as a fallback to
// render the timeline from the booking's current state before the first advance response arrives;
// the server's `legs` field is preferred whenever present.
export const LOGISTICS_STATES: Record<Exclude<FulfillmentMode, 'DROP_OFF'>, string[]> = {
  PICKUP_DELIVERY: ['PICKUP_SCHEDULED', 'DRIVER_EN_ROUTE_PICKUP', 'PICKED_UP', 'AT_CENTER', 'READY_FOR_RETURN', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  AT_HOME: ['TECH_ASSIGNED', 'TECH_EN_ROUTE', 'TECH_ARRIVED', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED'],
};

export interface LogisticsStatus {
  bookingId: number;
  mode: FulfillmentMode;
  currentState: string | null;
  etaText?: string | null;
  declined: boolean;
  declineReason?: string | null;
  legs?: string[];
  updatedAt: string;
}

// POST body for advancing a leg: omit targetState to step to the next leg, or name a later leg to jump.
export interface AdvanceLogisticsRequest {
  targetState?: string;
}

// ── Center-authored capability (modes / service area / fees) ──
export type FeeRuleType = 'FLAT' | 'PER_KM';

export interface FeeRule {
  type: FeeRuleType;
  flatAmount?: number | null;
  baseAmount?: number | null;
  perKm?: number | null;
}

export interface CenterFulfillmentCapability {
  centerId: number;
  serviceId?: number | null;
  supportedModes: string[];
  serviceAreaGovernorates: string[];
  feeByMode: Record<string, FeeRule>;
  centerLat?: number | null;
  centerLng?: number | null;
}

export interface UpdateCapabilityRequest {
  supportedModes: string[];
  serviceAreaGovernorates: string[];
  pickupBase?: number | null;
  pickupPerKm?: number | null;
  atHomeFlat?: number | null;
}

/** Ordered legs for a mode, preferring the server sequence when present. */
export function legsFor(mode: FulfillmentMode, serverLegs?: string[]): string[] {
  if (serverLegs?.length) return serverLegs;
  if (mode === 'DROP_OFF') return [];
  return LOGISTICS_STATES[mode] ?? [];
}

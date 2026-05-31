// Spec 025 — inventory & parts. Field names mirror the backend `inventory` domain exactly (the
// HTTP contracts the InventoryController returns). Money is KD, 3 decimals (reuse formatKD).

export type Unit = 'PIECE' | 'LITRE' | 'SET' | 'METER' | 'PAIR';

export type MovementType = 'RECEIVE' | 'ADJUST' | 'CONSUME' | 'CONSUME_REVERSAL';

export const UNITS: Unit[] = ['PIECE', 'LITRE', 'SET', 'METER', 'PAIR'];

export interface Part {
  id: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  category?: string | null;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  supplier?: string | null;
  reorderThreshold: number;
  onHand: number;
  isActive: boolean;
}

export interface StockMovement {
  id: number;
  partId: number;
  type: MovementType;
  /** Signed: RECEIVE/CONSUME_REVERSAL > 0, CONSUME < 0, ADJUST = delta. */
  quantity: number;
  unitCost?: number | null;
  reason?: string | null;
  bookingId?: number | null;
  actorName: string;
  createdAt: string;
}

export interface CreatePartRequest {
  nameAr: string;
  nameEn: string;
  sku: string;
  category?: string;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  supplier?: string;
  reorderThreshold: number;
}

export interface UpdatePartRequest extends CreatePartRequest {
  isActive?: boolean;
}

export interface ReceiveStockRequest {
  quantity: number;
  unitCost?: number;
}

export interface AdjustStockRequest {
  newOnHand: number;
  reason: string;
}

export interface LowStockItem {
  partId: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  onHand: number;
  reorderThreshold: number;
  supplier?: string | null;
  suggestedReorderQty: number;
}

export interface UsageRow {
  partId: number;
  nameEn: string;
  nameAr: string;
  consumedQty: number;
}

export interface InventoryReport {
  from: string;
  to: string;
  stockValue: number;
  usage: UsageRow[];
  fastMovers: number[];
  slowMovers: number[];
  partsMargin: number;
  reorder: LowStockItem[];
}

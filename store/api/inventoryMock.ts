// Spec 025 — dependency-free in-memory mock for the inventory catalog. Used only when
// EXPO_PUBLIC_USE_MOCKS=true (see inventoryApi). No MSW / no new deps — mirrors quoteRequestsMock.
// Quote-driven consumption lives in the real backend; the mock exercises the catalog/stock UI.
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type {
  AdjustStockRequest,
  CreatePartRequest,
  InventoryReport,
  LowStockItem,
  Part,
  ReceiveStockRequest,
  StockMovement,
  UpdatePartRequest,
} from '@/types/inventory';

let nextPartId = 30;
let nextMovementId = 500;

const parts: Record<number, Part> = {
  12: { id: 12, nameAr: 'تيل فرامل أمامي', nameEn: 'Front brake pads', sku: 'BP-FRT-001', category: 'Brakes', unit: 'SET', costPrice: 8.0, salePrice: 12.5, supplier: 'AutoParts Co', reorderThreshold: 3, onHand: 7, isActive: true },
  7: { id: 7, nameAr: 'زيت محرك 5W-30', nameEn: 'Engine oil 5W-30', sku: 'OIL-530', category: 'Fluids', unit: 'LITRE', costPrice: 1.2, salePrice: 2.5, supplier: 'Lube Ltd', reorderThreshold: 10, onHand: 4, isActive: true },
  19: { id: 19, nameAr: 'فلتر هواء', nameEn: 'Air filter', sku: 'AF-200', category: 'Filters', unit: 'PIECE', costPrice: 2.0, salePrice: 4.0, supplier: 'AutoParts Co', reorderThreshold: 5, onHand: 12, isActive: true },
};
const movements: StockMovement[] = [
  { id: 480, partId: 12, type: 'RECEIVE', quantity: 10, unitCost: 8.0, reason: null, bookingId: null, actorName: 'Sara (Owner)', createdAt: new Date(Date.now() - 9 * 86400_000).toISOString() },
  { id: 481, partId: 12, type: 'CONSUME', quantity: -3, unitCost: null, reason: null, bookingId: 123, actorName: 'Ali (Tech)', createdAt: new Date(Date.now() - 2 * 86400_000).toISOString() },
];

const round3 = (n: number) => Math.round(n * 1000) / 1000;
type Result = { data: unknown } | { error: FetchBaseQueryError };
const ok = (data: unknown): Result => ({ data });
const err = (status: number, message?: string): Result => ({
  error: { status, data: message ? { businessErrorDescription: message } : undefined } as FetchBaseQueryError,
});

function lowStockOf(p: Part): LowStockItem {
  return {
    partId: p.id, nameAr: p.nameAr, nameEn: p.nameEn, sku: p.sku, onHand: p.onHand,
    reorderThreshold: p.reorderThreshold, supplier: p.supplier,
    suggestedReorderQty: Math.max(p.reorderThreshold * 2 - p.onHand, 1),
  };
}

function addMovement(partId: number, type: StockMovement['type'], quantity: number, unitCost?: number, reason?: string) {
  movements.unshift({
    id: nextMovementId++, partId, type, quantity, unitCost: unitCost ?? null, reason: reason ?? null,
    bookingId: null, actorName: 'Sara (Owner)', createdAt: new Date().toISOString(),
  });
}

function handle(url: string, method: string, body: any, query: URLSearchParams): Result {
  if (url === 'centers/my/parts') {
    if (method === 'POST') {
      const req = body as CreatePartRequest;
      if (Object.values(parts).some((p) => p.sku === req.sku)) return err(400, 'A part with this SKU already exists');
      const id = nextPartId++;
      parts[id] = { id, ...req, category: req.category ?? null, supplier: req.supplier ?? null, onHand: 0, isActive: true };
      return ok(parts[id]);
    }
    let list = Object.values(parts);
    if (query.get('lowStock') === 'true') {
      list = list.filter((p) => p.isActive && p.onHand <= p.reorderThreshold);
    } else {
      const q = (query.get('search') ?? '').toLowerCase().trim();
      if (q) list = list.filter((p) => p.nameEn.toLowerCase().includes(q) || p.nameAr.includes(q) || p.sku.toLowerCase().includes(q));
    }
    return ok(list.sort((a, b) => a.nameEn.localeCompare(b.nameEn)));
  }

  if (url === 'centers/my/inventory/low-stock' && method === 'GET') {
    return ok(Object.values(parts).filter((p) => p.isActive && p.onHand <= p.reorderThreshold).map(lowStockOf));
  }

  if (url === 'centers/my/inventory/report' && method === 'GET') {
    const list = Object.values(parts);
    const stockValue = round3(list.filter((p) => p.onHand > 0).reduce((s, p) => s + p.onHand * p.costPrice, 0));
    const usageMap: Record<number, number> = {};
    movements.forEach((m) => {
      if (m.type === 'CONSUME' || m.type === 'CONSUME_REVERSAL') usageMap[m.partId] = (usageMap[m.partId] ?? 0) - m.quantity;
    });
    const usage = Object.entries(usageMap)
      .filter(([id, q]) => q !== 0 && parts[Number(id)])
      .map(([id, q]) => ({ partId: Number(id), nameEn: parts[Number(id)].nameEn, nameAr: parts[Number(id)].nameAr, consumedQty: q }))
      .sort((a, b) => b.consumedQty - a.consumedQty);
    const partsMargin = round3(usage.reduce((s, u) => s + (parts[u.partId].salePrice - parts[u.partId].costPrice) * u.consumedQty, 0));
    const report: InventoryReport = {
      from: query.get('from') ?? '', to: query.get('to') ?? '', stockValue, usage,
      fastMovers: usage.slice(0, 5).map((u) => u.partId),
      slowMovers: [...usage].sort((a, b) => a.consumedQty - b.consumedQty).slice(0, 5).map((u) => u.partId),
      partsMargin, reorder: list.filter((p) => p.isActive && p.onHand <= p.reorderThreshold).map(lowStockOf),
    };
    return ok(report);
  }

  const idMatch = url.match(/^centers\/my\/parts\/(\d+)$/);
  if (idMatch) {
    const p = parts[Number(idMatch[1])];
    if (!p) return err(404);
    if (method === 'PUT') {
      const req = body as UpdatePartRequest;
      if (req.sku !== p.sku && Object.values(parts).some((x) => x.sku === req.sku)) return err(400, 'A part with this SKU already exists');
      Object.assign(p, { ...req, category: req.category ?? null, supplier: req.supplier ?? null, isActive: req.isActive ?? p.isActive });
      return ok(p);
    }
    if (method === 'DELETE') {
      p.isActive = false;
      return ok(undefined);
    }
  }

  const movMatch = url.match(/^centers\/my\/parts\/(\d+)\/movements$/);
  if (movMatch && method === 'GET') {
    const id = Number(movMatch[1]);
    if (!parts[id]) return err(404);
    return ok(movements.filter((m) => m.partId === id));
  }

  const recvMatch = url.match(/^centers\/my\/parts\/(\d+)\/receive$/);
  if (recvMatch && method === 'POST') {
    const p = parts[Number(recvMatch[1])];
    if (!p) return err(404);
    const req = body as ReceiveStockRequest;
    p.onHand += req.quantity;
    addMovement(p.id, 'RECEIVE', req.quantity, req.unitCost);
    return ok(p);
  }

  const adjMatch = url.match(/^centers\/my\/parts\/(\d+)\/adjust$/);
  if (adjMatch && method === 'POST') {
    const p = parts[Number(adjMatch[1])];
    if (!p) return err(404);
    const req = body as AdjustStockRequest;
    const delta = req.newOnHand - p.onHand;
    p.onHand = req.newOnHand;
    addMovement(p.id, 'ADJUST', delta, undefined, req.reason);
    return ok(p);
  }

  return err(404);
}

export const inventoryMockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args) => {
    const raw = typeof args === 'string' ? args : args.url;
    const method = (typeof args === 'string' ? 'GET' : args.method ?? 'GET').toUpperCase();
    const body = typeof args === 'string' ? undefined : args.body;
    const [path, qs] = raw.replace(/^\//, '').split('?');
    await new Promise((r) => setTimeout(r, 200));
    return handle(path, method, body, new URLSearchParams(qs ?? '')) as
      | { data: unknown }
      | { error: FetchBaseQueryError };
  };

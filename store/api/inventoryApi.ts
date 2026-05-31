import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/constants/config';
import type { RootState } from '@/store';
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
import { inventoryMockBaseQuery } from './inventoryMock';

// Spec 025 — Inventory & Parts (center). Catalog CRUD, stock movements, low-stock, reports.
// Consumption is not an endpoint here — it happens server-side on quote commit (and reverses on cancel).
const realBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.session?.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQuery =
  process.env.EXPO_PUBLIC_USE_MOCKS === 'true' ? inventoryMockBaseQuery : realBaseQuery;

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery,
  tagTypes: ['Part', 'PartList', 'Movements', 'LowStock', 'InvReport'],
  endpoints: (builder) => ({
    getParts: builder.query<Part[], { search?: string; lowStock?: boolean } | void>({
      query: (args) => {
        const p = new URLSearchParams();
        if (args && args.search) p.set('search', args.search);
        if (args && args.lowStock) p.set('lowStock', 'true');
        const qs = p.toString();
        return `centers/my/parts${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['PartList'],
    }),

    createPart: builder.mutation<Part, CreatePartRequest>({
      query: (body) => ({ url: 'centers/my/parts', method: 'POST', body }),
      invalidatesTags: ['PartList', 'LowStock'],
    }),

    updatePart: builder.mutation<Part, { id: number; body: UpdatePartRequest }>({
      query: ({ id, body }) => ({ url: `centers/my/parts/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Part', id }, 'PartList', 'LowStock'],
    }),

    deactivatePart: builder.mutation<void, number>({
      query: (id) => ({ url: `centers/my/parts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PartList', 'LowStock'],
    }),

    getMovements: builder.query<StockMovement[], number>({
      query: (id) => `centers/my/parts/${id}/movements`,
      providesTags: (_r, _e, id) => [{ type: 'Movements', id }],
    }),

    receiveStock: builder.mutation<Part, { id: number; body: ReceiveStockRequest }>({
      query: ({ id, body }) => ({ url: `centers/my/parts/${id}/receive`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Part', id }, { type: 'Movements', id }, 'PartList', 'LowStock', 'InvReport'],
    }),

    adjustStock: builder.mutation<Part, { id: number; body: AdjustStockRequest }>({
      query: ({ id, body }) => ({ url: `centers/my/parts/${id}/adjust`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Part', id }, { type: 'Movements', id }, 'PartList', 'LowStock', 'InvReport'],
    }),

    getLowStock: builder.query<LowStockItem[], void>({
      query: () => 'centers/my/inventory/low-stock',
      providesTags: ['LowStock'],
    }),

    getReport: builder.query<InventoryReport, { from: string; to: string }>({
      query: ({ from, to }) => `centers/my/inventory/report?from=${from}&to=${to}`,
      providesTags: ['InvReport'],
    }),
  }),
});

export const {
  useGetPartsQuery,
  useCreatePartMutation,
  useUpdatePartMutation,
  useDeactivatePartMutation,
  useGetMovementsQuery,
  useReceiveStockMutation,
  useAdjustStockMutation,
  useGetLowStockQuery,
  useGetReportQuery,
} = inventoryApi;

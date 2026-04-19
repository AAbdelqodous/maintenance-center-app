import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  descriptionAr: z.string().optional(),
  partsCost: z.number({ invalid_type_error: 'Parts cost required' }).min(0),
  laborCost: z.number({ invalid_type_error: 'Labor cost required' }).min(0),
});

export const quoteSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  discountAmount: z.number().min(0).optional(),
  discountReason: z.string().optional(),
  estimatedDurationMinutes: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  notesAr: z.string().optional(),
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

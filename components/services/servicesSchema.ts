import { z } from 'zod';

const priceRefinement = (data: { minPrice?: number | null; maxPrice?: number | null }) => {
  if (data.minPrice != null && data.maxPrice != null) {
    return data.maxPrice >= data.minPrice;
  }
  return true;
};

const pricingFields = {
  minPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .min(0, 'Price must be 0 or more')
    .optional()
    .nullable(),
  maxPrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .min(0, 'Price must be 0 or more')
    .optional()
    .nullable(),
  typicalDurationMinutes: z
    .number({ invalid_type_error: 'Enter a valid number' })
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 minute')
    .optional()
    .nullable(),
  descriptionAr: z.string().max(500, 'Max 500 characters').optional().nullable(),
  descriptionEn: z.string().max(500, 'Max 500 characters').optional().nullable(),
};

export const addCenterServiceSchema = z
  .object({
    categoryId: z.number({ required_error: 'Select a category' }),
    serviceId: z.number({ required_error: 'Select a service' }),
    ...pricingFields,
  })
  .refine(priceRefinement, { message: 'Max price must be ≥ min price', path: ['maxPrice'] });

export type AddCenterServiceForm = z.infer<typeof addCenterServiceSchema>;

export const editCenterServiceSchema = z
  .object(pricingFields)
  .refine(priceRefinement, { message: 'Max price must be ≥ min price', path: ['maxPrice'] });

export type EditCenterServiceForm = z.infer<typeof editCenterServiceSchema>;

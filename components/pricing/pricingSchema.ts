import { z } from 'zod';
import { ServiceType } from '../../types/pricing';

export const pricingSchema = z.object({
  serviceType:            z.nativeEnum(ServiceType),
  serviceNameAr:          z.string().min(1, 'Arabic name is required'),
  serviceNameEn:          z.string().min(1, 'English name is required'),
  minPrice:               z.number({ invalid_type_error: 'Min price is required' }).min(0),
  maxPrice:               z.number({ invalid_type_error: 'Max price is required' }).min(0),
  typicalDurationMinutes: z.number().int().min(1, 'Duration must be at least 1 minute').optional(),
  descriptionAr:          z.string().optional(),
  descriptionEn:          z.string().optional(),
}).refine(
  (data) => data.maxPrice >= data.minPrice,
  { message: 'Maximum price must be greater than or equal to minimum price', path: ['maxPrice'] }
);

export type PricingFormValues = z.infer<typeof pricingSchema>;

import { z } from 'zod';
import { WorkStage } from '../../types/workProgress';

export const stageUpdateSchema = z.object({
  stage: z.nativeEnum(WorkStage),
  notes: z.string().max(500).optional(),
  notesAr: z.string().max(500).optional(),
  internalNotes: z.string().optional(),
  estimatedMinutesRemaining: z.number().int().min(1).optional(),
});

export const progressUpdateSchema = z.object({
  notes: z.string().max(500).optional(),
  internalNotes: z.string().optional(),
});

export type ProgressUpdateFormValues = z.infer<typeof progressUpdateSchema>;

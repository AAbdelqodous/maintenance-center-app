import { z } from 'zod';

export const inviteStaffSchema = z.object({
  targetEmail: z.string().email({ message: 'validation.invalidEmail' }),
  targetRole: z.enum(
    ['BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'ACCOUNTANT'],
    { required_error: 'validation.required' }
  ),
});

export type InviteStaffFormData = z.infer<typeof inviteStaffSchema>;

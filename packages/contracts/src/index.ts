import { z } from 'zod';

/**
 * Single source of truth for GDG HAU Member data.
 * All changes to the database or UI data flow must start here.
 */
export const HauMemberSchema = z.object({
  id: z.string().uuid().optional(),
  hauId: z.string().describe("Formatted as GDG-HAU-26-XXXX"),
  fullName: z.string(),
  email: z.string().email(),
  course: z.string(),
  yearLevel: z.number().min(1).max(5),
  isAccepted: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export type HauMember = z.infer<typeof HauMemberSchema>;

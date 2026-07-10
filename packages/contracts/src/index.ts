import { z } from 'zod';

/**
 * Single source of truth for GDG HAU Member data.
 */
export const HauMemberSchema = z.object({
  id: z.string().uuid().optional(),
  studentId: z.string(), // Private
  gdgId: z.string().describe("Formatted as GDG-HAU-26-XXXX"),
  fullName: z.string(),
  email: z.string().email(),
  program: z.string(),
  department: z.string(),
  isAccepted: z.boolean().default(false),
  createdAt: z.date().optional(),
});

export type HauMember = z.infer<typeof HauMemberSchema>;

/**
 * Public Member Profile: safe for frontend rendering (No student_id or department).
 */
export const PublicMemberProfileSchema = z.object({
  gdgId: z.string(),
  fullName: z.string(),
  program: z.string(),
  email: z.string().email(),
  department: z.string().optional(),
});

export type PublicMemberProfile = z.infer<typeof PublicMemberProfileSchema>;

/**
 * API Route Validation
 */
export const SearchRequestSchema = z.object({
  type: z.enum(['email', 'barcode']),
  value: z.string().min(1),
  // Removed recaptchaToken as requested
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

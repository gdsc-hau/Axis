import { z } from "zod";

export const MemberStatusSchema = z.enum([
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
  "INACTIVE",
  "ALUMNI",
]);

export type MemberStatus = z.infer<typeof MemberStatusSchema>;

export const MemberRoleSchema = z.enum(["MEMBER", "ADMIN"]);

export type MemberRole = z.infer<typeof MemberRoleSchema>;

const restrictedMemberStatuses = new Set<MemberStatus>([
  "REJECTED",
  "SUSPENDED",
  "INACTIVE",
  "ALUMNI",
]);

export const UpdateMemberStatusSchema = z
  .object({
    memberId: z.string().uuid(),
    memberStatus: MemberStatusSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine(({ memberStatus, reason }, context) => {
    if (restrictedMemberStatuses.has(memberStatus) && !reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: `A reason is required when setting status to ${memberStatus}.`,
      });
    }
  });

export const UpdateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: MemberRoleSchema,
});

const NormalizedEmailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((email) => email.toLowerCase());

export const InviteMemberEmailsSchema = z
  .string()
  .trim()
  .min(1, "Enter at least one email address.")
  .transform((input) =>
    Array.from(
      new Set(
        input
          .split(/[\n,]+/)
          .map((email) => email.trim())
          .filter(Boolean),
      ),
    ),
  )
  .pipe(
    z.array(NormalizedEmailSchema).min(1, "Enter at least one email address."),
  )
  .transform((emails) => Array.from(new Set(emails)))
  .refine((emails) => emails.length <= 25, {
    message: "Send no more than 25 invitations at once.",
  });

export const ConfirmInvitationSchema = z.object({
  email: NormalizedEmailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit invitation code."),
});

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
  memberStatus: MemberStatusSchema.default("PENDING"),
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
});

export type PublicMemberProfile = z.infer<typeof PublicMemberProfileSchema>;

export const MemberSearchResultSchema = PublicMemberProfileSchema.extend({
  verificationToken: z.string().min(1),
  verificationUrl: z.string().url(),
  tokenExpiresAt: z.string().datetime(),
});

export type MemberSearchResult = z.infer<typeof MemberSearchResultSchema>;

/**
 * API Route Validation
 */
export const SearchRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("email"),
    value: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((email) => email.toLowerCase()),
  }),
  z.object({
    type: z.literal("barcode"),
    value: z.string().trim().min(1).max(128),
  }),
]);

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const EventStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "COMPLETED",
  "CANCELLED",
]);

export type EventStatus = z.infer<typeof EventStatusSchema>;

export const EventSourceProviderSchema = z.enum(["MANUAL", "BEVY"]);

export type EventSourceProvider = z.infer<typeof EventSourceProviderSchema>;

export const BevyEventStatusSchema = z.enum(["Draft", "Published", "Canceled"]);

export type BevyEventStatus = z.infer<typeof BevyEventStatusSchema>;

const BevyIdentifierSchema = z
  .union([z.string().trim().min(1).max(200), z.number().int().nonnegative()])
  .transform(String);

const BevyHttpsUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Bevy URLs must use HTTPS." },
  );

export const BevyEventPictureSchema = z
  .object({
    url: BevyHttpsUrlSchema.optional().nullable(),
    thumbnail_url: BevyHttpsUrlSchema.optional().nullable(),
    thumbnail_width: z.number().nonnegative().optional().nullable(),
    thumbnail_height: z.number().nonnegative().optional().nullable(),
  })
  .passthrough();

export const BevyChapterSchema = z
  .object({
    id: BevyIdentifierSchema,
    title: z.string().trim().min(1).max(300),
    relative_url: z.string().trim().optional().nullable(),
    url: BevyHttpsUrlSchema.optional().nullable(),
  })
  .passthrough();

export const BevyEventSchema = z
  .object({
    id: BevyIdentifierSchema,
    title: z.string().trim().min(1).max(300),
    status: BevyEventStatusSchema,
    url: BevyHttpsUrlSchema,
    description_short: z.string().max(20_000).optional().nullable(),
    start_date: z.string().datetime({ offset: true }),
    end_date: z.string().datetime({ offset: true }),
    event_type_id: BevyIdentifierSchema.optional().nullable(),
    event_type_title: z.string().trim().max(300).optional().nullable(),
    picture: BevyEventPictureSchema.optional().nullable(),
    chapter: BevyChapterSchema,
    venue_name: z.string().trim().max(500).optional().nullable(),
    venue_address: z.string().trim().max(1_000).optional().nullable(),
    venue_city: z.string().trim().max(300).optional().nullable(),
    venue_zip_code: z.string().trim().max(100).optional().nullable(),
    get_event_address: z.string().trim().max(2_000).optional().nullable(),
    created_ts: z.string().datetime({ offset: true }).optional().nullable(),
    updated_ts: z.string().datetime({ offset: true }),
  })
  .passthrough()
  .refine(
    ({ start_date, end_date }) =>
      new Date(end_date).getTime() >= new Date(start_date).getTime(),
    {
      path: ["end_date"],
      message: "Bevy event end date must not precede its start date.",
    },
  );

export type BevyEvent = z.infer<typeof BevyEventSchema>;

export const BevyWebhookEnvelopeSchema = z
  .object({
    type: z.string().trim().min(1).max(100),
    data: z.array(z.unknown()).max(100),
  })
  .passthrough();

export const BevyWebhookPayloadSchema = z
  .array(BevyWebhookEnvelopeSchema)
  .min(1)
  .max(20);

export const LumaUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          ["luma.com", "www.luma.com", "lu.ma", "www.lu.ma"].includes(
            url.hostname.toLowerCase(),
          ) &&
          url.pathname !== "/"
        );
      } catch {
        return false;
      }
    },
    { message: "Use a complete HTTPS luma.com or lu.ma event URL." },
  );

export const EventIdSchema = z.string().uuid();

export const UpdateEventLumaUrlSchema = z.object({
  eventId: EventIdSchema,
  lumaUrl: LumaUrlSchema,
});

export const AttendanceStatusSchema = z.enum([
  "REGISTERED",
  "CHECKED_IN",
  "CONFIRMED",
  "CANCELLED",
  "NO_SHOW",
]);

export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const SetEventAttendancePointsSchema = z.object({
  eventId: EventIdSchema,
  points: z.coerce
    .number()
    .int("Enter a whole-number Gyrocoin award.")
    .min(0, "Attendance awards cannot be negative.")
    .max(1_000_000, "Attendance awards cannot exceed 1,000,000 Gyrocoins."),
});

export const AttendanceOperationKeySchema = z.string().uuid();

export const ManualEventCheckInSchema = z.object({
  eventId: EventIdSchema,
  memberId: z.string().uuid(),
  checkedInAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((value) => value || null),
  reason: z
    .string()
    .trim()
    .min(3, "Explain the manual check-in in at least 3 characters.")
    .max(500, "The manual check-in reason must not exceed 500 characters."),
  operationKey: AttendanceOperationKeySchema,
});

export const ConfirmEventAttendanceSchema = z.object({
  attendanceId: z.string().uuid(),
  note: z
    .string()
    .trim()
    .max(500, "The confirmation note must not exceed 500 characters.")
    .optional()
    .transform((value) => value || null),
  operationKey: AttendanceOperationKeySchema,
});

export const CorrectEventAttendanceSchema = z.object({
  attendanceId: z.string().uuid(),
  status: z.enum(["CHECKED_IN", "CANCELLED", "NO_SHOW"]),
  reason: z
    .string()
    .trim()
    .min(3, "Explain the correction in at least 3 characters.")
    .max(500, "The correction reason must not exceed 500 characters."),
  operationKey: AttendanceOperationKeySchema,
});

export const GyrocoinSourceTypeSchema = z.enum([
  "MANUAL_AWARD",
  "MANUAL_DEDUCTION",
  "EVENT_ATTENDANCE",
  "EVENT_ATTENDANCE_REVERSAL",
  "MARKETPLACE_REDEMPTION",
  "MARKETPLACE_REFUND",
]);

export type GyrocoinSourceType = z.infer<typeof GyrocoinSourceTypeSchema>;

export const GyrocoinAdjustmentKindSchema = z.enum(["AWARD", "DEDUCT"]);

export type GyrocoinAdjustmentKind = z.infer<
  typeof GyrocoinAdjustmentKindSchema
>;

export const AdminGyrocoinAdjustmentSchema = z.object({
  memberId: z.string().uuid(),
  adjustmentKind: GyrocoinAdjustmentKindSchema,
  amount: z.coerce
    .number()
    .int("Enter a whole number of Gyrocoins.")
    .min(1, "Enter at least 1 Gyrocoin.")
    .max(1_000_000, "A single adjustment cannot exceed 1,000,000 Gyrocoins."),
  reason: z
    .string()
    .trim()
    .min(3, "Explain the adjustment in at least 3 characters.")
    .max(500, "The adjustment reason must not exceed 500 characters."),
  operationKey: z.string().uuid(),
});

export type AdminGyrocoinAdjustment = z.infer<
  typeof AdminGyrocoinAdjustmentSchema
>;

export const RedemptionStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
]);

export type RedemptionStatus = z.infer<typeof RedemptionStatusSchema>;

const RewardSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter a reward slug.")
  .max(120, "The reward slug must not exceed 120 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens in the slug.",
  );

const NullableRewardDescriptionSchema = z
  .string()
  .trim()
  .max(5_000, "The reward description must not exceed 5,000 characters.")
  .transform((value) => value || null);

const NullableRewardImageUrlSchema = z
  .string()
  .trim()
  .max(2_048, "The image URL must not exceed 2,048 characters.")
  .refine((value) => !value || /^https:\/\/\S+$/i.test(value), {
    message: "Use a complete HTTPS image URL.",
  })
  .transform((value) => value || null);

export const MarketplaceRewardFieldsSchema = z.object({
  slug: RewardSlugSchema,
  name: z
    .string()
    .trim()
    .min(1, "Enter a reward name.")
    .max(200, "The reward name must not exceed 200 characters."),
  description: NullableRewardDescriptionSchema,
  imageUrl: NullableRewardImageUrlSchema,
  pointCost: z.coerce
    .number()
    .int("Enter a whole-number Gyrocoin cost.")
    .min(1, "A reward must cost at least 1 Gyrocoin.")
    .max(1_000_000, "A reward cannot cost more than 1,000,000 Gyrocoins."),
  stockQuantity: z.coerce
    .number()
    .int("Enter a whole-number stock quantity.")
    .min(0, "Stock cannot be negative.")
    .max(1_000_000, "Stock cannot exceed 1,000,000 units."),
  active: z.boolean(),
  sortOrder: z.coerce
    .number()
    .int("Enter a whole-number sort order.")
    .min(0, "Sort order cannot be negative.")
    .max(1_000_000, "Sort order cannot exceed 1,000,000."),
});

export const CreateMarketplaceRewardSchema = MarketplaceRewardFieldsSchema;

export const UpdateMarketplaceRewardSchema =
  MarketplaceRewardFieldsSchema.extend({
    rewardId: z.string().uuid(),
  });

export const RequestRewardRedemptionSchema = z.object({
  rewardId: z.string().uuid(),
  quantity: z.coerce
    .number()
    .int("Enter a whole-number quantity.")
    .min(1, "Redeem at least one item.")
    .max(100, "A single redemption cannot exceed 100 items."),
  operationKey: z.string().uuid(),
});

export const CancelRewardRedemptionSchema = z.object({
  redemptionId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Explain the cancellation in at least 3 characters.")
    .max(500, "The cancellation reason must not exceed 500 characters."),
  operationKey: z.string().uuid(),
});

export const ReviewRewardRedemptionSchema = z
  .object({
    redemptionId: z.string().uuid(),
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().max(500).optional(),
    operationKey: z.string().uuid(),
  })
  .superRefine(({ decision, reason }, context) => {
    if (decision === "REJECT" && (!reason || reason.length < 3)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Explain the rejection in at least 3 characters.",
      });
    }
  });

export const FulfillRewardRedemptionSchema = z.object({
  redemptionId: z.string().uuid(),
  note: z
    .string()
    .trim()
    .max(500, "The fulfillment note must not exceed 500 characters.")
    .optional(),
  operationKey: z.string().uuid(),
});

const RecognitionReasonSchema = z
  .string()
  .trim()
  .min(3, "Enter a reason with at least 3 characters.")
  .max(500, "The reason must not exceed 500 characters.");

export const CreateRecognitionBadgeSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter a badge slug.")
    .max(80, "The badge slug must not exceed 80 characters.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens in the slug.",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Enter a badge name.")
    .max(120, "The badge name must not exceed 120 characters."),
  description: z
    .string()
    .trim()
    .max(1_000, "The badge description must not exceed 1,000 characters.")
    .transform((value) => value || null),
  iconUrl: z
    .string()
    .trim()
    .max(2_000, "The icon URL must not exceed 2,000 characters.")
    .refine((value) => !value || /^https:\/\/\S+$/i.test(value), {
      message: "Use a complete HTTPS icon URL.",
    })
    .transform((value) => value || null),
  active: z.boolean(),
});

export const AwardRecognitionBadgeSchema = z.object({
  memberId: z.string().uuid(),
  badgeId: z.string().uuid(),
  reason: RecognitionReasonSchema,
  operationKey: z.string().uuid(),
});

export const RevokeRecognitionBadgeSchema = z.object({
  memberBadgeId: z.string().uuid(),
  reason: RecognitionReasonSchema,
  operationKey: z.string().uuid(),
});

export const AwardEventRecognitionBadgeSchema = z.object({
  eventId: z.string().uuid(),
  badgeId: z.string().uuid(),
  reason: RecognitionReasonSchema,
  operationKey: z.string().uuid(),
});

export const PrepareCertificateBatchSchema = z.object({
  eventId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(1, "Enter a certificate title.")
    .max(200, "The certificate title must not exceed 200 characters."),
  templateVersion: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/,
      "Use letters, numbers, dots, underscores, or hyphens for the template version.",
    ),
  operationKey: z.string().uuid(),
});

export const RevokeCertificateSchema = z.object({
  certificateId: z.string().uuid(),
  reason: RecognitionReasonSchema,
  operationKey: z.string().uuid(),
});

export const CertificateNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^GDGHAU-[0-9A-F]{32}$/, "Invalid certificate number.");

export const NotificationCategorySchema = z.enum([
  "SYSTEM",
  "ACCOUNT",
  "EVENT",
  "ATTENDANCE",
  "GYROCOIN",
  "REWARD",
  "CREDENTIAL",
  "ANNOUNCEMENT",
]);

export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

export const NotificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

export const NotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  accountEnabled: z.boolean(),
  eventEnabled: z.boolean(),
  attendanceEnabled: z.boolean(),
  gyrocoinEnabled: z.boolean(),
  rewardEnabled: z.boolean(),
  credentialEnabled: z.boolean(),
  announcementEnabled: z.boolean(),
});

const InternalNotificationUrlSchema = z
  .string()
  .trim()
  .max(500, "The action URL must not exceed 500 characters.")
  .refine(
    (value) =>
      !value ||
      (/^\/[A-Za-z0-9/_?=&.%#-]*$/.test(value) && !value.startsWith("//")),
    {
      message: "Use an internal Axis path beginning with one slash.",
    },
  )
  .transform((value) => value || null);

export const PublishNotificationCampaignSchema = z.object({
  category: z.enum(["ANNOUNCEMENT", "EVENT", "SYSTEM"]),
  title: z
    .string()
    .trim()
    .min(1, "Enter a campaign title.")
    .max(160, "The title must not exceed 160 characters."),
  message: z
    .string()
    .trim()
    .min(1, "Enter a campaign message.")
    .max(1000, "The message must not exceed 1,000 characters."),
  actionUrl: InternalNotificationUrlSchema,
  includeEmail: z.boolean(),
  operationKey: z.string().uuid(),
});

export const SetNotificationEmailDeliverySchema = z.object({
  enabled: z.boolean(),
});

export const ArticleStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
]);

export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

export const ArticleIdSchema = z.string().uuid();

const ArticleSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Enter a slug with at least 2 characters.")
  .max(120, "The slug must not exceed 120 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and single hyphens in the slug.",
  );

const OptionalTrimmedString = (maximum: number, message: string) =>
  z
    .string()
    .trim()
    .max(maximum, message)
    .transform((value) => value || null);

export const CreateArticleCategorySchema = z.object({
  slug: ArticleSlugSchema.max(
    80,
    "The category slug must not exceed 80 characters.",
  ),
  name: z
    .string()
    .trim()
    .min(2, "Enter a category name with at least 2 characters.")
    .max(100, "The category name must not exceed 100 characters."),
  description: OptionalTrimmedString(
    500,
    "The category description must not exceed 500 characters.",
  ),
  operationKey: z.string().uuid(),
});

export const UpdateArticleCategorySchema = z.object({
  categoryId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Enter a category name with at least 2 characters.")
    .max(100, "The category name must not exceed 100 characters."),
  description: OptionalTrimmedString(
    500,
    "The category description must not exceed 500 characters.",
  ),
  active: z.boolean(),
  reason: z
    .string()
    .trim()
    .min(5, "Explain the change in at least 5 characters.")
    .max(500, "The reason must not exceed 500 characters."),
  operationKey: z.string().uuid(),
});

const ArticleContentFieldsSchema = z.object({
  slug: ArticleSlugSchema,
  title: z
    .string()
    .trim()
    .min(3, "Enter an article title with at least 3 characters.")
    .max(160, "The title must not exceed 160 characters."),
  excerpt: z
    .string()
    .trim()
    .min(20, "Enter an excerpt with at least 20 characters.")
    .max(500, "The excerpt must not exceed 500 characters."),
  bodyMarkdown: z
    .string()
    .trim()
    .min(50, "Enter at least 50 characters of article content.")
    .max(50_000, "Article content must not exceed 50,000 characters."),
  categoryId: z.string().uuid(),
  relatedEventId: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(z.string().uuid().nullable()),
  featuredImageUrl: z
    .string()
    .trim()
    .max(1_000, "The featured image URL must not exceed 1,000 characters.")
    .refine((value) => !value || /^https:\/\/\S+$/i.test(value), {
      message: "Use a complete HTTPS featured image URL.",
    })
    .transform((value) => value || null),
  featured: z.boolean(),
  seoTitle: OptionalTrimmedString(
    160,
    "The SEO title must not exceed 160 characters.",
  ).refine((value) => value === null || value.length >= 3, {
    message: "The SEO title must contain at least 3 characters.",
  }),
  seoDescription: OptionalTrimmedString(
    320,
    "The SEO description must not exceed 320 characters.",
  ).refine((value) => value === null || value.length >= 20, {
    message: "The SEO description must contain at least 20 characters.",
  }),
});

export const CreateContentArticleSchema = ArticleContentFieldsSchema.extend({
  operationKey: z.string().uuid(),
});

export const UpdateContentArticleSchema = ArticleContentFieldsSchema.extend({
  articleId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().min(1),
  reason: z
    .string()
    .trim()
    .min(5, "Explain the edit in at least 5 characters.")
    .max(500, "The edit reason must not exceed 500 characters."),
  operationKey: z.string().uuid(),
});

export const TransitionContentArticleSchema = z
  .object({
    articleId: z.string().uuid(),
    expectedVersion: z.coerce.number().int().min(1),
    targetStatus: ArticleStatusSchema,
    scheduledFor: z
      .string()
      .trim()
      .transform((value) => value || null)
      .pipe(z.string().datetime({ offset: true }).nullable()),
    reason: z
      .string()
      .trim()
      .min(5, "Explain the status change in at least 5 characters.")
      .max(500, "The status-change reason must not exceed 500 characters."),
    operationKey: z.string().uuid(),
  })
  .superRefine(({ targetStatus, scheduledFor }, context) => {
    if (targetStatus === "SCHEDULED" && !scheduledFor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Choose a future publication date and time.",
      });
    }
    if (targetStatus !== "SCHEDULED" && scheduledFor) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledFor"],
        message: "Only scheduled articles may include a publication time.",
      });
    }
  });

const OptionalHttpsProfileUrlSchema = z
  .string()
  .trim()
  .max(2_048, "Profile URLs must not exceed 2,048 characters.")
  .refine((value) => !value || /^https:\/\/\S+$/i.test(value), {
    message: "Use a complete HTTPS profile URL.",
  })
  .transform((value) => value || null);

export const UpdateCurrentMemberProfileSchema = z.object({
  expectedVersion: z.coerce.number().int().min(1),
  bio: z
    .string()
    .trim()
    .min(1, "Enter a short bio.")
    .max(1_000, "The bio must not exceed 1,000 characters."),
  phoneNumber: z
    .string()
    .trim()
    .max(30, "The phone number must not exceed 30 characters.")
    .refine(
      (value) => !value || (value.length >= 7 && /^[0-9+(). -]+$/.test(value)),
      { message: "Enter a valid phone number using 7 to 30 characters." },
    )
    .transform((value) => value || null),
  linkedinUrl: OptionalHttpsProfileUrlSchema,
  githubUrl: OptionalHttpsProfileUrlSchema,
  reason: z
    .string()
    .trim()
    .min(3, "Explain the profile change in at least 3 characters.")
    .max(500, "The reason must not exceed 500 characters."),
  operationKey: z.string().uuid(),
});

export const PortalSettingsValueSchema = z.object({
  organization_name: z.string().min(2).max(120),
  support_email: z.string().email().or(z.literal("")),
  dashboard_message: z.string().max(500),
  default_report_days: z.number().int().min(1).max(366),
  leaderboard_limit: z.number().int().min(10).max(100),
});

export type PortalSettingsValue = z.infer<typeof PortalSettingsValueSchema>;

export const UpdatePortalSettingsSchema = z.object({
  expectedVersion: z.coerce.number().int().min(1),
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter an organization name with at least 2 characters.")
    .max(120, "The organization name must not exceed 120 characters."),
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "The support email must not exceed 254 characters.")
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid support email address.",
    }),
  dashboardMessage: z
    .string()
    .trim()
    .max(500, "The dashboard message must not exceed 500 characters."),
  defaultReportDays: z.coerce.number().int().min(1).max(366),
  leaderboardLimit: z.coerce.number().int().min(10).max(100),
  reason: z
    .string()
    .trim()
    .min(5, "Explain the settings change in at least 5 characters.")
    .max(500, "The reason must not exceed 500 characters."),
  operationKey: z.string().uuid(),
});

export const SystemHealthStatusSchema = z.enum([
  "RUNNING",
  "PASS",
  "WARN",
  "FAIL",
]);

export type SystemHealthStatus = z.infer<typeof SystemHealthStatusSchema>;

export const RunSystemHealthCheckSchema = z.object({
  operationKey: z.string().uuid(),
  applicationVersion: z
    .string()
    .trim()
    .min(1, "An application version is required.")
    .max(100, "The application version must not exceed 100 characters.")
    .regex(
      /^[A-Za-z0-9._+:/-]+$/,
      "The application version contains unsupported characters.",
    ),
});

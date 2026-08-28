export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      members: Table<
        {
          id: string;
          auth_id: string | null;
          student_id: string;
          gdg_id: string;
          full_name: string;
          email: string;
          program: string;
          department: string;
          role: "MEMBER" | "ADMIN";
          member_status:
            | "PENDING"
            | "ACTIVE"
            | "REJECTED"
            | "SUSPENDED"
            | "INACTIVE"
            | "ALUMNI";
          is_accepted: boolean;
          invited_at: string | null;
          activated_at: string | null;
          profile_completed_at: string | null;
          profile_version: number;
          deactivated_at: string | null;
          deactivation_reason: string | null;
          bio: string | null;
          phone_number: string | null;
          links: Json | null;
          status_message: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          auth_id?: string | null;
          student_id: string;
          gdg_id: string;
          full_name: string;
          email: string;
          program: string;
          department: string;
          role?: "MEMBER" | "ADMIN";
          member_status?:
            | "PENDING"
            | "ACTIVE"
            | "REJECTED"
            | "SUSPENDED"
            | "INACTIVE"
            | "ALUMNI";
          is_accepted?: boolean;
          invited_at?: string | null;
          activated_at?: string | null;
          profile_completed_at?: string | null;
          profile_version?: number;
          deactivated_at?: string | null;
          deactivation_reason?: string | null;
          bio?: string | null;
          phone_number?: string | null;
          links?: Json | null;
          status_message?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      events: Table<
        {
          id: string;
          title: string;
          description: string | null;
          location: string | null;
          luma_url: string | null;
          status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
          event_type: string | null;
          start_at: string | null;
          end_at: string | null;
          source_provider: "MANUAL" | "BEVY";
          source_event_id: string | null;
          source_chapter_id: string | null;
          source_url: string | null;
          image_url: string | null;
          source_status: "Draft" | "Published" | "Canceled" | null;
          source_updated_at: string | null;
          last_synced_at: string | null;
          source_payload_hash: string | null;
          attendance_points: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          title: string;
          description?: string | null;
          location?: string | null;
          luma_url?: string | null;
          status?: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
          event_type?: string | null;
          start_at?: string | null;
          end_at?: string | null;
          source_provider?: "MANUAL" | "BEVY";
          source_event_id?: string | null;
          source_chapter_id?: string | null;
          source_url?: string | null;
          image_url?: string | null;
          source_status?: "Draft" | "Published" | "Canceled" | null;
          source_updated_at?: string | null;
          last_synced_at?: string | null;
          source_payload_hash?: string | null;
          attendance_points?: number;
          created_at?: string;
          updated_at?: string;
        }
      >;
      event_attendance: Table<
        {
          id: string;
          event_id: string;
          member_id: string;
          status:
            "REGISTERED" | "CHECKED_IN" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
          attendance_source: "LUMA_CSV" | "MANUAL";
          registered_at: string;
          checked_in_at: string | null;
          checked_in_by: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          confirmation_note: string | null;
          award_points: number;
          award_ledger_id: string | null;
          reversal_ledger_id: string | null;
          import_batch_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          event_id: string;
          member_id: string;
          status?:
            "REGISTERED" | "CHECKED_IN" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
          attendance_source?: "LUMA_CSV" | "MANUAL";
          registered_at?: string;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          confirmation_note?: string | null;
          award_points?: number;
          award_ledger_id?: string | null;
          reversal_ledger_id?: string | null;
          import_batch_id?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      attendance_import_batches: Table<
        {
          id: string;
          event_id: string;
          source: "LUMA_CSV";
          file_name: string;
          file_sha256: string;
          operation_key: string;
          total_rows: number;
          matched_rows: number;
          unmatched_rows: number;
          ineligible_rows: number;
          ignored_rows: number;
          duplicate_rows: number;
          created_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          event_id: string;
          source?: "LUMA_CSV";
          file_name: string;
          file_sha256: string;
          operation_key: string;
          total_rows: number;
          matched_rows?: number;
          unmatched_rows?: number;
          ineligible_rows?: number;
          ignored_rows?: number;
          duplicate_rows?: number;
          created_by?: string | null;
          created_at?: string;
        }
      >;
      event_attendance_status_history: Table<
        {
          id: string;
          attendance_id: string;
          from_status:
            | "REGISTERED"
            | "CHECKED_IN"
            | "CONFIRMED"
            | "CANCELLED"
            | "NO_SHOW"
            | null;
          to_status:
            "REGISTERED" | "CHECKED_IN" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
          action:
            "LUMA_IMPORTED" | "MANUAL_CHECK_IN" | "CONFIRMED" | "CORRECTED";
          actor_id: string | null;
          reason: string | null;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          attendance_id: string;
          from_status?:
            | "REGISTERED"
            | "CHECKED_IN"
            | "CONFIRMED"
            | "CANCELLED"
            | "NO_SHOW"
            | null;
          to_status:
            "REGISTERED" | "CHECKED_IN" | "CONFIRMED" | "CANCELLED" | "NO_SHOW";
          action:
            "LUMA_IMPORTED" | "MANUAL_CHECK_IN" | "CONFIRMED" | "CORRECTED";
          actor_id?: string | null;
          reason?: string | null;
          operation_key: string;
          created_at?: string;
        }
      >;
      points_ledger: Table<
        {
          id: string;
          ledger_sequence: number;
          member_id: string;
          source_type:
            | "MANUAL_AWARD"
            | "MANUAL_DEDUCTION"
            | "EVENT_ATTENDANCE"
            | "EVENT_ATTENDANCE_REVERSAL"
            | "MARKETPLACE_REDEMPTION"
            | "MARKETPLACE_REFUND";
          source_id: string;
          points: number;
          balance_after: number;
          note: string | null;
          created_at: string;
        },
        {
          id?: string;
          ledger_sequence?: never;
          member_id: string;
          source_type:
            | "MANUAL_AWARD"
            | "MANUAL_DEDUCTION"
            | "EVENT_ATTENDANCE"
            | "EVENT_ATTENDANCE_REVERSAL"
            | "MARKETPLACE_REDEMPTION"
            | "MARKETPLACE_REFUND";
          source_id: string;
          points: number;
          balance_after: number;
          note?: string | null;
          created_at?: string;
        }
      >;
      badges: Table<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon_url?: string | null;
          active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      member_badges: Table<
        {
          id: string;
          member_id: string;
          badge_id: string;
          earned_at: string;
          status: "AWARDED" | "REVOKED";
          source: "MANUAL" | "EVENT_ATTENDANCE";
          event_id: string | null;
          attendance_id: string | null;
          reason: string | null;
          awarded_by: string | null;
          operation_key: string;
          revoked_at: string | null;
          revoked_by: string | null;
          revocation_reason: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          member_id: string;
          badge_id: string;
          earned_at?: string;
          status?: "AWARDED" | "REVOKED";
          source?: "MANUAL" | "EVENT_ATTENDANCE";
          event_id?: string | null;
          attendance_id?: string | null;
          reason?: string | null;
          awarded_by?: string | null;
          operation_key?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revocation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      badge_award_batches: Table<
        {
          id: string;
          badge_id: string;
          event_id: string;
          operation_key: string;
          reason: string;
          eligible_count: number;
          awarded_count: number;
          skipped_count: number;
          created_by: string;
          created_at: string;
        },
        {
          id?: string;
          badge_id: string;
          event_id: string;
          operation_key: string;
          reason: string;
          eligible_count?: number;
          awarded_count?: number;
          skipped_count?: number;
          created_by: string;
          created_at?: string;
        }
      >;
      badge_award_status_history: Table<
        {
          id: string;
          member_badge_id: string;
          from_status: "AWARDED" | "REVOKED" | null;
          to_status: "AWARDED" | "REVOKED";
          actor_id: string | null;
          reason: string | null;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          member_badge_id: string;
          from_status?: "AWARDED" | "REVOKED" | null;
          to_status: "AWARDED" | "REVOKED";
          actor_id?: string | null;
          reason?: string | null;
          operation_key: string;
          created_at?: string;
        }
      >;
      certificate_issuance_batches: Table<
        {
          id: string;
          event_id: string;
          title: string;
          template_version: string;
          operation_key: string;
          status:
            "PREPARED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
          eligible_count: number;
          prepared_count: number;
          issued_count: number;
          failed_count: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          event_id: string;
          title: string;
          template_version: string;
          operation_key: string;
          status?:
            "PREPARED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
          eligible_count?: number;
          prepared_count?: number;
          issued_count?: number;
          failed_count?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      certificates: Table<
        {
          id: string;
          member_id: string;
          event_id: string;
          attendance_id: string;
          issuance_batch_id: string | null;
          title: string;
          certificate_number: string;
          storage_path: string | null;
          template_version: string;
          status: "PENDING" | "ISSUED" | "FAILED" | "REVOKED";
          issued_at: string | null;
          issued_by: string | null;
          request_operation_key: string;
          failure_reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          revocation_reason: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          member_id: string;
          event_id: string;
          attendance_id: string;
          issuance_batch_id?: string | null;
          title: string;
          certificate_number: string;
          storage_path?: string | null;
          template_version?: string;
          status: "PENDING" | "ISSUED" | "FAILED" | "REVOKED";
          issued_at?: string | null;
          issued_by?: string | null;
          request_operation_key?: string;
          failure_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revocation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      certificate_status_history: Table<
        {
          id: string;
          certificate_id: string;
          from_status: "PENDING" | "ISSUED" | "FAILED" | "REVOKED" | null;
          to_status: "PENDING" | "ISSUED" | "FAILED" | "REVOKED";
          actor_id: string | null;
          reason: string | null;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          certificate_id: string;
          from_status?: "PENDING" | "ISSUED" | "FAILED" | "REVOKED" | null;
          to_status: "PENDING" | "ISSUED" | "FAILED" | "REVOKED";
          actor_id?: string | null;
          reason?: string | null;
          operation_key: string;
          created_at?: string;
        }
      >;
      rewards: Table<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_url: string | null;
          point_cost: number;
          stock_quantity: number;
          active: boolean;
          sort_order: number;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          point_cost: number;
          stock_quantity?: number;
          active?: boolean;
          sort_order?: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      redemptions: Table<
        {
          id: string;
          member_id: string;
          reward_id: string;
          status:
            "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";
          quantity: number;
          unit_cost: number;
          total_cost: number;
          request_operation_key: string;
          debit_ledger_id: string;
          refund_ledger_id: string | null;
          approved_by: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          cancellation_reason: string | null;
          fulfilled_by: string | null;
          fulfilled_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          member_id: string;
          reward_id: string;
          status?:
            "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";
          quantity: number;
          unit_cost: number;
          total_cost: number;
          request_operation_key: string;
          debit_ledger_id: string;
          refund_ledger_id?: string | null;
          approved_by?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          cancellation_reason?: string | null;
          fulfilled_by?: string | null;
          fulfilled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      redemption_status_history: Table<
        {
          id: string;
          redemption_id: string;
          operation_key: string;
          actor_id: string | null;
          from_status:
            | "PENDING"
            | "APPROVED"
            | "FULFILLED"
            | "REJECTED"
            | "CANCELLED"
            | null;
          to_status:
            "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";
          reason: string | null;
          created_at: string;
        },
        {
          id?: string;
          redemption_id: string;
          operation_key: string;
          actor_id?: string | null;
          from_status?:
            | "PENDING"
            | "APPROVED"
            | "FULFILLED"
            | "REJECTED"
            | "CANCELLED"
            | null;
          to_status:
            "PENDING" | "APPROVED" | "FULFILLED" | "REJECTED" | "CANCELLED";
          reason?: string | null;
          created_at?: string;
        }
      >;
      article_categories: Table<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          active: boolean;
          version: number;
          create_operation_key: string;
          created_by: string;
          updated_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          active?: boolean;
          version?: number;
          create_operation_key: string;
          created_by: string;
          updated_by: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      article_category_revisions: Table<
        {
          id: string;
          category_id: string;
          revision_number: number;
          name: string;
          description: string | null;
          active: boolean;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          category_id: string;
          revision_number: number;
          name: string;
          description?: string | null;
          active: boolean;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at?: string;
        }
      >;
      articles: Table<
        {
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          body_markdown: string;
          category_id: string;
          related_event_id: string | null;
          featured_image_url: string | null;
          status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
          featured: boolean;
          seo_title: string | null;
          seo_description: string | null;
          author_id: string;
          author_display_name: string;
          updated_by: string;
          version: number;
          create_operation_key: string;
          scheduled_for: string | null;
          published_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          slug: string;
          title: string;
          excerpt: string;
          body_markdown: string;
          category_id: string;
          related_event_id?: string | null;
          featured_image_url?: string | null;
          status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
          featured?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          author_id: string;
          author_display_name: string;
          updated_by: string;
          version?: number;
          create_operation_key: string;
          scheduled_for?: string | null;
          published_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      article_revisions: Table<
        {
          id: string;
          article_id: string;
          revision_number: number;
          slug: string;
          title: string;
          excerpt: string;
          body_markdown: string;
          category_id: string;
          related_event_id: string | null;
          featured_image_url: string | null;
          featured: boolean;
          seo_title: string | null;
          seo_description: string | null;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          article_id: string;
          revision_number: number;
          slug: string;
          title: string;
          excerpt: string;
          body_markdown: string;
          category_id: string;
          related_event_id?: string | null;
          featured_image_url?: string | null;
          featured: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at?: string;
        }
      >;
      article_status_history: Table<
        {
          id: string;
          article_id: string;
          from_status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" | null;
          to_status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
          scheduled_for: string | null;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          article_id: string;
          from_status?: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED" | null;
          to_status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
          scheduled_for?: string | null;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at?: string;
        }
      >;
      notifications: Table<
        {
          id: string;
          member_id: string;
          type:
            | "SYSTEM"
            | "ACCOUNT"
            | "EVENT"
            | "ATTENDANCE"
            | "GYROCOIN"
            | "REWARD"
            | "CREDENTIAL"
            | "ANNOUNCEMENT";
          title: string;
          message: string;
          action_url: string | null;
          source_type: string | null;
          source_id: string | null;
          related_id: string | null;
          dedupe_key: string | null;
          read: boolean;
          read_at: string | null;
          dismissed_at: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          member_id: string;
          type:
            | "SYSTEM"
            | "ACCOUNT"
            | "EVENT"
            | "ATTENDANCE"
            | "GYROCOIN"
            | "REWARD"
            | "CREDENTIAL"
            | "ANNOUNCEMENT";
          title: string;
          message: string;
          action_url?: string | null;
          source_type?: string | null;
          source_id?: string | null;
          related_id?: string | null;
          dedupe_key?: string | null;
          read?: boolean;
          read_at?: string | null;
          dismissed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      member_notification_preferences: Table<
        {
          member_id: string;
          email_enabled: boolean;
          account_enabled: boolean;
          event_enabled: boolean;
          attendance_enabled: boolean;
          gyrocoin_enabled: boolean;
          reward_enabled: boolean;
          credential_enabled: boolean;
          announcement_enabled: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          member_id: string;
          email_enabled?: boolean;
          account_enabled?: boolean;
          event_enabled?: boolean;
          attendance_enabled?: boolean;
          gyrocoin_enabled?: boolean;
          reward_enabled?: boolean;
          credential_enabled?: boolean;
          announcement_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      notification_campaigns: Table<
        {
          id: string;
          operation_key: string;
          category: "ANNOUNCEMENT" | "EVENT" | "SYSTEM";
          title: string;
          message: string;
          action_url: string | null;
          include_email: boolean;
          recipient_count: number;
          created_by: string;
          created_at: string;
        },
        {
          id?: string;
          operation_key: string;
          category: "ANNOUNCEMENT" | "EVENT" | "SYSTEM";
          title: string;
          message: string;
          action_url?: string | null;
          include_email?: boolean;
          recipient_count?: number;
          created_by: string;
          created_at?: string;
        }
      >;
      notification_delivery_config: Table<
        {
          singleton: boolean;
          email_delivery_enabled: boolean;
          updated_by: string | null;
          updated_at: string;
        },
        {
          singleton?: boolean;
          email_delivery_enabled?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        }
      >;
      notification_email_outbox: Table<
        {
          id: string;
          notification_id: string;
          member_id: string;
          recipient_email: string;
          subject: string;
          text_body: string;
          provider: "RESEND";
          status: "QUEUED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
          attempt_count: number;
          next_attempt_at: string;
          claimed_at: string | null;
          sent_at: string | null;
          provider_message_id: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          notification_id: string;
          member_id: string;
          recipient_email: string;
          subject: string;
          text_body: string;
          provider?: "RESEND";
          status?: "QUEUED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
          attempt_count?: number;
          next_attempt_at?: string;
          claimed_at?: string | null;
          sent_at?: string | null;
          provider_message_id?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      id_qr_codes: Table<
        {
          id: string;
          member_id: string;
          qr_value: string;
          expires_at: string;
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          member_id: string;
          qr_value: string;
          expires_at: string;
          is_active?: boolean;
          created_at?: string;
        }
      >;
      member_credentials: Table<
        {
          id: string;
          member_id: string;
          credential_type: string;
          credential_number: string | null;
          issued_at: string | null;
          expires_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          member_id: string;
          credential_type: string;
          credential_number?: string | null;
          issued_at?: string | null;
          expires_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      member_verifications: Table<
        {
          id: string;
          member_id: string;
          verified_by: string | null;
          verification_type: string;
          notes: string | null;
          created_at: string;
        },
        {
          id?: string;
          member_id: string;
          verified_by?: string | null;
          verification_type: string;
          notes?: string | null;
          created_at?: string;
        }
      >;
      member_profile_revisions: Table<
        {
          id: string;
          member_id: string;
          revision_number: number;
          bio: string;
          phone_number: string | null;
          links: Json;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          member_id: string;
          revision_number: number;
          bio: string;
          phone_number?: string | null;
          links?: Json;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at?: string;
        }
      >;
      verification_logs: Table<
        {
          id: string;
          member_id: string;
          verified_by: string;
          action: string;
          metadata: Json | null;
          created_at: string;
        },
        {
          id?: string;
          member_id: string;
          verified_by: string;
          action: string;
          metadata?: Json | null;
          created_at?: string;
        }
      >;
      app_settings: Table<
        {
          id: string;
          key: string;
          value: Json;
          version: number;
          updated_by: string | null;
          updated_at: string;
        },
        {
          id?: string;
          key: string;
          value: Json;
          version?: number;
          updated_by?: string | null;
          updated_at?: string;
        }
      >;
      app_setting_revisions: Table<
        {
          id: string;
          setting_id: string;
          setting_key: string;
          from_version: number;
          to_version: number;
          from_value: Json;
          to_value: Json;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at: string;
        },
        {
          id?: string;
          setting_id: string;
          setting_key: string;
          from_version: number;
          to_version: number;
          from_value: Json;
          to_value: Json;
          actor_id: string;
          reason: string;
          operation_key: string;
          created_at?: string;
        }
      >;
      system_health_runs: Table<
        {
          id: string;
          operation_key: string;
          status: "RUNNING" | "PASS" | "WARN" | "FAIL";
          total_checks: number;
          passed_checks: number;
          warning_checks: number;
          failed_checks: number;
          application_version: string;
          initiated_by: string;
          started_at: string;
          completed_at: string | null;
        },
        {
          id?: string;
          operation_key: string;
          status?: "RUNNING" | "PASS" | "WARN" | "FAIL";
          total_checks?: number;
          passed_checks?: number;
          warning_checks?: number;
          failed_checks?: number;
          application_version: string;
          initiated_by: string;
          started_at?: string;
          completed_at?: string | null;
        }
      >;
      system_health_results: Table<
        {
          id: string;
          run_id: string;
          check_key: string;
          category: string;
          status: "PASS" | "WARN" | "FAIL";
          details: string;
          sort_order: number;
          checked_at: string;
        },
        {
          id?: string;
          run_id: string;
          check_key: string;
          category: string;
          status: "PASS" | "WARN" | "FAIL";
          details: string;
          sort_order: number;
          checked_at?: string;
        }
      >;
      audit_logs: Table<
        {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        },
        {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      run_system_health_check: {
        Args: {
          p_operation_key: string;
          p_application_version: string;
        };
        Returns: Database["public"]["Tables"]["system_health_runs"]["Row"];
      };
      create_article_category: {
        Args: {
          p_slug: string;
          p_name: string;
          p_description: string | null;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["article_categories"]["Row"];
      };
      update_article_category: {
        Args: {
          p_category_id: string;
          p_expected_version: number;
          p_name: string;
          p_description: string | null;
          p_active: boolean;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["article_categories"]["Row"];
      };
      create_content_article: {
        Args: {
          p_slug: string;
          p_title: string;
          p_excerpt: string;
          p_body_markdown: string;
          p_category_id: string;
          p_related_event_id: string | null;
          p_featured_image_url: string | null;
          p_featured: boolean;
          p_seo_title: string | null;
          p_seo_description: string | null;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["articles"]["Row"];
      };
      update_content_article: {
        Args: {
          p_article_id: string;
          p_expected_version: number;
          p_slug: string;
          p_title: string;
          p_excerpt: string;
          p_body_markdown: string;
          p_category_id: string;
          p_related_event_id: string | null;
          p_featured_image_url: string | null;
          p_featured: boolean;
          p_seo_title: string | null;
          p_seo_description: string | null;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["articles"]["Row"];
      };
      transition_content_article: {
        Args: {
          p_article_id: string;
          p_expected_version: number;
          p_target_status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
          p_scheduled_for: string | null;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["articles"]["Row"];
      };
      list_public_articles: {
        Args: { p_category_slug?: string | null; p_limit?: number };
        Returns: Array<{
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          category_slug: string;
          category_name: string;
          featured_image_url: string | null;
          featured: boolean;
          author_display_name: string;
          publication_at: string;
          updated_at: string;
        }>;
      };
      get_public_article: {
        Args: { p_slug: string };
        Returns: Array<{
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          body_markdown: string;
          category_slug: string;
          category_name: string;
          featured_image_url: string | null;
          author_display_name: string;
          publication_at: string;
          updated_at: string;
          seo_title: string | null;
          seo_description: string | null;
          related_event_id: string | null;
          related_event_title: string | null;
          related_event_url: string | null;
        }>;
      };
      list_public_article_categories: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          id: string;
          slug: string;
          name: string;
          description: string | null;
          article_count: number;
        }>;
      };
      mark_notification_read: {
        Args: { p_notification_id: string };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
      dismiss_notification: {
        Args: { p_notification_id: string };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      update_current_notification_preferences: {
        Args: {
          p_email_enabled: boolean;
          p_account_enabled: boolean;
          p_event_enabled: boolean;
          p_attendance_enabled: boolean;
          p_gyrocoin_enabled: boolean;
          p_reward_enabled: boolean;
          p_credential_enabled: boolean;
          p_announcement_enabled: boolean;
        };
        Returns: Database["public"]["Tables"]["member_notification_preferences"]["Row"];
      };
      publish_notification_campaign: {
        Args: {
          p_category: string;
          p_title: string;
          p_message: string;
          p_action_url: string | null;
          p_include_email: boolean;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["notification_campaigns"]["Row"];
      };
      set_notification_email_delivery: {
        Args: { p_enabled: boolean };
        Returns: Database["public"]["Tables"]["notification_delivery_config"]["Row"];
      };
      claim_notification_email_batch: {
        Args: { p_limit?: number };
        Returns: Array<
          Database["public"]["Tables"]["notification_email_outbox"]["Row"]
        >;
      };
      complete_notification_email: {
        Args: { p_outbox_id: string; p_provider_message_id: string };
        Returns: Database["public"]["Tables"]["notification_email_outbox"]["Row"];
      };
      fail_notification_email: {
        Args: {
          p_outbox_id: string;
          p_error: string;
          p_retryable?: boolean;
        };
        Returns: Database["public"]["Tables"]["notification_email_outbox"]["Row"];
      };
      create_recognition_badge: {
        Args: {
          p_slug: string;
          p_name: string;
          p_description: string | null;
          p_icon_url: string | null;
          p_active: boolean;
        };
        Returns: Database["public"]["Tables"]["badges"]["Row"];
      };
      update_recognition_badge: {
        Args: {
          p_badge_id: string;
          p_name: string;
          p_description: string | null;
          p_icon_url: string | null;
          p_active: boolean;
        };
        Returns: Database["public"]["Tables"]["badges"]["Row"];
      };
      award_recognition_badge: {
        Args: {
          p_member_id: string;
          p_badge_id: string;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["member_badges"]["Row"];
      };
      revoke_recognition_badge: {
        Args: {
          p_member_badge_id: string;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["member_badges"]["Row"];
      };
      award_event_recognition_badge: {
        Args: {
          p_event_id: string;
          p_badge_id: string;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["badge_award_batches"]["Row"];
      };
      prepare_event_certificate_batch: {
        Args: {
          p_event_id: string;
          p_title: string;
          p_template_version: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["certificate_issuance_batches"]["Row"];
      };
      finalize_event_certificate: {
        Args: {
          p_certificate_id: string;
          p_storage_path: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["certificates"]["Row"];
      };
      fail_event_certificate: {
        Args: {
          p_certificate_id: string;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["certificates"]["Row"];
      };
      retry_event_certificate: {
        Args: { p_certificate_id: string; p_operation_key: string };
        Returns: Database["public"]["Tables"]["certificates"]["Row"];
      };
      revoke_event_certificate: {
        Args: {
          p_certificate_id: string;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["certificates"]["Row"];
      };
      get_public_certificate_verification: {
        Args: { p_certificate_number: string };
        Returns: Array<{
          certificate_number: string;
          certificate_status: "ISSUED" | "REVOKED";
          certificate_title: string;
          member_full_name: string;
          member_gdg_id: string;
          event_title: string;
          event_start_at: string | null;
          issued_at: string;
        }>;
      };
      cancel_reward_redemption: {
        Args: {
          p_redemption_id: string;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["redemptions"]["Row"];
      };
      create_marketplace_reward: {
        Args: {
          p_slug: string;
          p_name: string;
          p_description: string | null;
          p_image_url: string | null;
          p_point_cost: number;
          p_stock_quantity: number;
          p_active: boolean;
          p_sort_order: number;
        };
        Returns: Database["public"]["Tables"]["rewards"]["Row"];
      };
      fulfill_reward_redemption: {
        Args: {
          p_redemption_id: string;
          p_note: string | null;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["redemptions"]["Row"];
      };
      request_reward_redemption: {
        Args: {
          p_reward_id: string;
          p_quantity: number;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["redemptions"]["Row"];
      };
      review_reward_redemption: {
        Args: {
          p_redemption_id: string;
          p_decision: string;
          p_reason: string | null;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["redemptions"]["Row"];
      };
      update_marketplace_reward: {
        Args: {
          p_reward_id: string;
          p_slug: string;
          p_name: string;
          p_description: string | null;
          p_image_url: string | null;
          p_point_cost: number;
          p_stock_quantity: number;
          p_active: boolean;
          p_sort_order: number;
        };
        Returns: Database["public"]["Tables"]["rewards"]["Row"];
      };
      adjust_member_gyrocoins: {
        Args: {
          p_member_id: string;
          p_points: number;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["points_ledger"]["Row"];
      };
      award_points: {
        Args: {
          p_member_id: string;
          p_points: number;
          p_source_type: string;
          p_source_id?: string;
          p_note?: string;
        };
        Returns: Database["public"]["Tables"]["points_ledger"]["Row"];
      };
      current_gyrocoin_wallet_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          member_id: string;
          current_balance: number;
          total_earned: number;
          total_spent: number;
          transaction_count: number;
        }>;
      };
      current_member_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      update_current_member_profile: {
        Args: {
          p_expected_version: number;
          p_bio: string;
          p_phone_number: string | null;
          p_links: Json;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["members"]["Row"];
      };
      get_portal_settings: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["app_settings"]["Row"];
      };
      update_portal_settings: {
        Args: {
          p_expected_version: number;
          p_organization_name: string;
          p_support_email: string;
          p_dashboard_message: string;
          p_default_report_days: number;
          p_leaderboard_limit: number;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["app_settings"]["Row"];
      };
      get_current_member_dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          current_balance: number;
          confirmed_attendance_count: number;
          active_badge_count: number;
          issued_certificate_count: number;
          open_redemption_count: number;
          unread_notification_count: number;
          upcoming_event_count: number;
        }>;
      };
      confirm_event_attendance: {
        Args: {
          p_attendance_id: string;
          p_note: string | null;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["event_attendance"]["Row"];
      };
      correct_event_attendance: {
        Args: {
          p_attendance_id: string;
          p_status: "CHECKED_IN" | "CANCELLED" | "NO_SHOW";
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["event_attendance"]["Row"];
      };
      import_luma_attendance_csv: {
        Args: {
          p_event_id: string;
          p_file_name: string;
          p_file_sha256: string;
          p_rows: Json;
          p_operation_key: string;
        };
        Returns: Json;
      };
      record_manual_event_check_in: {
        Args: {
          p_event_id: string;
          p_member_id: string;
          p_checked_in_at: string | null;
          p_reason: string;
          p_operation_key: string;
        };
        Returns: Database["public"]["Tables"]["event_attendance"]["Row"];
      };
      complete_current_member_profile: {
        Args: { p_full_name: string; p_bio: string; p_links?: Json };
        Returns: undefined;
      };
      link_current_member_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      list_gyrocoin_accounts: {
        Args: Record<PropertyKey, never>;
        Returns: Array<{
          member_id: string;
          full_name: string;
          email: string;
          gdg_id: string;
          member_status: string;
          current_balance: number;
          transaction_count: number;
          last_transaction_at: string | null;
        }>;
      };
      list_member_leaderboard: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: Array<{
          rank_position: number;
          member_id: string;
          full_name: string;
          gdg_id: string;
          current_balance: number;
          total_earned: number;
          total_spent: number;
          transaction_count: number;
          is_current_member: boolean;
        }>;
      };
      get_admin_report_metrics: {
        Args: { p_start_at: string; p_end_at: string };
        Returns: Array<{
          section: string;
          metric: string;
          value: number;
        }>;
      };
      list_admin_event_participation_report: {
        Args: {
          p_start_at: string;
          p_end_at: string;
          p_event_id?: string | null;
          p_limit?: number;
        };
        Returns: Array<{
          event_id: string;
          title: string;
          start_at: string;
          event_status: string;
          registered_count: number;
          checked_in_count: number;
          confirmed_count: number;
          no_show_count: number;
          cancelled_count: number;
          net_points_awarded: number;
        }>;
      };
      record_member_invitation: {
        Args: { p_member_id: string };
        Returns: undefined;
      };
      set_member_role: {
        Args: { p_member_id: string; p_role: string };
        Returns: undefined;
      };
      set_member_status: {
        Args: {
          p_member_id: string;
          p_member_status: string;
          p_reason?: string;
        };
        Returns: undefined;
      };
      set_event_luma_url: {
        Args: { p_event_id: string; p_luma_url: string };
        Returns: undefined;
      };
      set_event_attendance_points: {
        Args: { p_event_id: string; p_points: number };
        Returns: Database["public"]["Tables"]["events"]["Row"];
      };
      sync_bevy_event: {
        Args: {
          p_source_event_id: string;
          p_source_chapter_id: string;
          p_title: string;
          p_description: string | null;
          p_location: string | null;
          p_event_type: string | null;
          p_start_at: string;
          p_end_at: string;
          p_source_url: string;
          p_image_url: string | null;
          p_source_status: "Draft" | "Published" | "Canceled";
          p_source_updated_at: string;
          p_source_payload_hash: string;
        };
        Returns: Database["public"]["Tables"]["events"]["Row"];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

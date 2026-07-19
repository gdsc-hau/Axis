-- Normalize the legacy camelCase domain schema to PostgreSQL snake_case.
-- RENAME COLUMN preserves data, indexes, constraints, and policy expressions.

DO $$
DECLARE
  mapping RECORD;
BEGIN
  FOR mapping IN
    SELECT * FROM (VALUES
      ('app_settings','updatedAt','updated_at'),
      ('audit_logs','actorId','actor_id'), ('audit_logs','entityType','entity_type'), ('audit_logs','entityId','entity_id'), ('audit_logs','createdAt','created_at'),
      ('badges','createdAt','created_at'),
      ('certificates','memberId','member_id'), ('certificates','eventId','event_id'), ('certificates','certificateNumber','certificate_number'), ('certificates','pdfUrl','pdf_url'), ('certificates','issuedAt','issued_at'), ('certificates','createdAt','created_at'),
      ('event_attendance','eventId','event_id'), ('event_attendance','memberId','member_id'), ('event_attendance','checkedInAt','checked_in_at'), ('event_attendance','confirmedBy','confirmed_by'), ('event_attendance','createdAt','created_at'), ('event_attendance','updatedAt','updated_at'),
      ('events','lumaUrl','luma_url'), ('events','eventType','event_type'), ('events','startAt','start_at'), ('events','endAt','end_at'), ('events','createdAt','created_at'), ('events','updatedAt','updated_at'),
      ('id_qr_codes','memberId','member_id'), ('id_qr_codes','qrValue','qr_value'), ('id_qr_codes','expiresAt','expires_at'), ('id_qr_codes','isActive','is_active'), ('id_qr_codes','createdAt','created_at'),
      ('member_badges','memberId','member_id'), ('member_badges','badgeId','badge_id'), ('member_badges','earnedAt','earned_at'),
      ('member_credentials','memberId','member_id'), ('member_credentials','credentialType','credential_type'), ('member_credentials','credentialNumber','credential_number'), ('member_credentials','issuedAt','issued_at'), ('member_credentials','expiresAt','expires_at'), ('member_credentials','createdAt','created_at'), ('member_credentials','updatedAt','updated_at'),
      ('member_verifications','memberId','member_id'), ('member_verifications','verifiedBy','verified_by'), ('member_verifications','verificationType','verification_type'), ('member_verifications','createdAt','created_at'),
      ('notifications','memberId','member_id'), ('notifications','relatedId','related_id'), ('notifications','createdAt','created_at'),
      ('points_ledger','memberId','member_id'), ('points_ledger','sourceType','source_type'), ('points_ledger','sourceId','source_id'), ('points_ledger','balanceAfter','balance_after'), ('points_ledger','createdAt','created_at'),
      ('redemptions','memberId','member_id'), ('redemptions','totalCost','total_cost'), ('redemptions','approvedBy','approved_by'), ('redemptions','fulfilledAt','fulfilled_at'), ('redemptions','createdAt','created_at'),
      ('verification_logs','memberId','member_id'), ('verification_logs','verifiedBy','verified_by'), ('verification_logs','createdAt','created_at')
    ) AS columns(table_name, old_name, new_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = mapping.table_name AND column_name = mapping.old_name
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = mapping.table_name AND column_name = mapping.new_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN %I TO %I', mapping.table_name, mapping.old_name, mapping.new_name);
    END IF;
  END LOOP;
END
$$;

NOTIFY pgrst, 'reload schema';

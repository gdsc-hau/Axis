-- Corrective RLS migration for databases where the initial RLS migration was
-- already applied before append-only policy hardening.

DO $$
DECLARE
  target_table TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'member_credentials', 'member_verifications', 'id_qr_codes',
    'verification_logs', 'app_settings', 'events', 'event_attendance',
    'points_ledger', 'badges', 'member_badges', 'certificates',
    'redemptions', 'notifications', 'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_admin_all', target_table);
  END LOOP;

  FOREACH target_table IN ARRAY ARRAY[
    'member_credentials', 'member_verifications', 'id_qr_codes',
    'app_settings', 'events', 'badges', 'member_badges'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_admin_all', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      target_table || '_admin_all', target_table
    );
  END LOOP;

  FOREACH target_table IN ARRAY ARRAY[
    'verification_logs', 'event_attendance', 'points_ledger',
    'certificates', 'audit_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_admin_read', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_admin_insert', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin())',
      target_table || '_admin_read', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
      target_table || '_admin_insert', target_table
    );
  END LOOP;

  FOREACH target_table IN ARRAY ARRAY['event_attendance', 'certificates']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_admin_update', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      target_table || '_admin_update', target_table
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS redemptions_admin_read ON public.redemptions;
DROP POLICY IF EXISTS redemptions_admin_update ON public.redemptions;
CREATE POLICY redemptions_admin_read ON public.redemptions
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY redemptions_admin_update ON public.redemptions
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS notifications_admin_read ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
CREATE POLICY notifications_admin_read ON public.notifications
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY notifications_admin_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

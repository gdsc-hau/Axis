-- Database authorization for the Axis applications.
-- Service-role clients bypass RLS; all cookie/anonymous clients are constrained here.

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.members WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'ADMIN' FROM public.members WHERE auth_id = auth.uid() LIMIT 1),
    FALSE
  )
$$;

REVOKE ALL ON FUNCTION public.current_member_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select_self_or_admin ON public.members;
CREATE POLICY members_select_self_or_admin ON public.members
  FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS members_update_self_or_admin ON public.members;
DROP POLICY IF EXISTS members_update_admin ON public.members;
CREATE POLICY members_update_admin ON public.members
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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

  -- Configuration and catalog-style tables may be fully managed by admins.
  FOREACH target_table IN ARRAY ARRAY[
    'member_credentials', 'member_verifications', 'id_qr_codes',
    'app_settings', 'events', 'badges', 'member_badges'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      target_table || '_admin_all', target_table
    );
  END LOOP;
END
$$;

-- Historical and financial tables are deliberately append-only. Even admins
-- cannot rewrite or delete ledger/audit history through an authenticated client.
DO $$
DECLARE
  target_table TEXT;
BEGIN
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

  -- Certificates and attendance can be corrected/revoked without deleting history.
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

-- Redemption state may advance, but requests should not be deleted.
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

DROP POLICY IF EXISTS events_public_read ON public.events;
CREATE POLICY events_public_read ON public.events
  FOR SELECT TO anon, authenticated
  USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS badges_public_read ON public.badges;
CREATE POLICY badges_public_read ON public.badges
  FOR SELECT TO anon, authenticated
  USING (active);

-- The deployed database predates the snake_case standard and uses "memberId"
-- in domain tables. Fresh databases use member_id. Build equivalent policies
-- dynamically so this migration is safe for both schemas.
DO $$
DECLARE
  target_table TEXT;
  member_column TEXT;
  policy_name TEXT;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'event_attendance', 'points_ledger', 'member_badges',
    'certificates', 'redemptions', 'notifications'
  ]
  LOOP
    SELECT column_name
      INTO member_column
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND information_schema.columns.table_name = target_table
       AND column_name IN ('member_id', 'memberId')
     ORDER BY CASE column_name WHEN 'member_id' THEN 1 ELSE 2 END
     LIMIT 1;

    IF member_column IS NULL THEN
      RAISE EXCEPTION 'Neither member_id nor memberId exists on public.%', target_table;
    END IF;

    policy_name := target_table || '_member_read';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%I = public.current_member_id())',
      policy_name,
      target_table,
      member_column
    );
  END LOOP;
END
$$;

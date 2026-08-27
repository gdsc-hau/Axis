-- Remove a legacy administrator INSERT policy left by the original schema.
-- Phase 8 already revoked direct INSERT privileges, so this policy was not
-- exploitable; removing it prevents a future privilege grant from reactivating
-- an unaudited write path.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20260826001721'
  ) THEN
    RAISE EXCEPTION 'Phase 8 communications must be deployed first';
  END IF;
END
$$;

DROP POLICY IF EXISTS notifications_admin_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_member_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_update ON public.notifications;
DROP POLICY IF EXISTS notifications_member_update ON public.notifications;
DROP POLICY IF EXISTS notifications_admin_delete ON public.notifications;
DROP POLICY IF EXISTS notifications_member_delete ON public.notifications;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.notifications
  FROM PUBLIC, anon, authenticated, service_role;

-- Keep members.full_name owned by the preloaded member registry. The legacy
-- parameter remains in the RPC signature for compatibility, but callers may
-- only echo the current registry value and the function never writes it.
CREATE OR REPLACE FUNCTION private.complete_current_member_profile(
  p_full_name TEXT,
  p_bio TEXT,
  p_links JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_member public.members;
  normalized_bio TEXT := btrim(p_bio);
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF normalized_bio IS NULL
     OR normalized_bio = ''
     OR char_length(normalized_bio) > 1000 THEN
    RAISE EXCEPTION 'Bio must contain 1 to 1000 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_links IS NULL OR jsonb_typeof(p_links) <> 'object' THEN
    RAISE EXCEPTION 'Links must be a JSON object' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO target_member
    FROM public.members
   WHERE auth_id = (SELECT auth.uid())
     AND member_status = 'ACTIVE'
   FOR UPDATE;

  IF target_member.id IS NULL THEN
    RAISE EXCEPTION 'Active linked member account required'
      USING ERRCODE = '42501';
  END IF;

  IF p_full_name IS DISTINCT FROM target_member.full_name THEN
    RAISE EXCEPTION 'Registered full name cannot be changed during profile completion'
      USING ERRCODE = '42501';
  END IF;

  IF target_member.profile_completed_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.members
     SET bio = normalized_bio,
         links = p_links,
         profile_completed_at = clock_timestamp()
   WHERE id = target_member.id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    target_member.id,
    'MEMBER_PROFILE_COMPLETED',
    'member',
    target_member.id::TEXT,
    jsonb_build_object(
      'fields', jsonb_build_array('bio', 'links'),
      'registry_full_name_preserved', TRUE
    )
  );
END
$$;

REVOKE ALL ON FUNCTION private.complete_current_member_profile(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.complete_current_member_profile(TEXT, TEXT, JSONB)
  TO authenticated;

-- Reassert the exposed wrapper's invoker posture and execution boundary.
CREATE OR REPLACE FUNCTION public.complete_current_member_profile(
  p_full_name TEXT,
  p_bio TEXT,
  p_links JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.complete_current_member_profile(p_full_name, p_bio, p_links)
$$;

REVOKE ALL ON FUNCTION public.complete_current_member_profile(TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_current_member_profile(TEXT, TEXT, JSONB)
  TO authenticated;

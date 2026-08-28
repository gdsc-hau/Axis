-- Make the one-time onboarding completion operation safe to retry. The row
-- lock serializes concurrent submissions, while the early return prevents
-- profile rewrites and duplicate MEMBER_PROFILE_COMPLETED audit entries.
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
  normalized_name TEXT := btrim(p_full_name);
  normalized_bio TEXT := btrim(p_bio);
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF normalized_name = '' OR char_length(normalized_name) > 100 THEN
    RAISE EXCEPTION 'Full name must contain 1 to 100 characters'
      USING ERRCODE = '22023';
  END IF;
  IF normalized_bio = '' OR char_length(normalized_bio) > 1000 THEN
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

  IF target_member.profile_completed_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.members
     SET full_name = normalized_name,
         bio = normalized_bio,
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
    jsonb_build_object('fields', jsonb_build_array('full_name', 'bio', 'links'))
  );
END
$$;

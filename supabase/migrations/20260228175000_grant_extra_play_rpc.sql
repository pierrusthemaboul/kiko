-- ============================================================
-- RPC: grant_extra_play
-- Grants +1 play by incrementing profiles.parties_per_day server-side.
-- SECURITY DEFINER to avoid requiring direct UPDATE permission on profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_extra_play(
    p_increment integer DEFAULT 1
)
RETURNS TABLE(
    old_allowed integer,
    new_allowed integer
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id uuid;
    v_old integer;
    v_new integer;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_increment IS NULL OR p_increment < 1 OR p_increment > 5 THEN
        RAISE EXCEPTION 'Invalid increment';
    END IF;

    -- Lock the row to make the increment atomic.
    SELECT COALESCE(p.parties_per_day, 3)
      INTO v_old
      FROM public.profiles p
     WHERE p.id = v_user_id
     FOR UPDATE;

    IF v_old IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;

    v_new := v_old + p_increment;

    UPDATE public.profiles
       SET parties_per_day = v_new,
           updated_at = now()
     WHERE id = v_user_id;

    RETURN QUERY SELECT v_old, v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_extra_play(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_extra_play(integer) TO authenticated;

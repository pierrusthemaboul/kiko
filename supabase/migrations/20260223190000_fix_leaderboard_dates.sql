-- Correction de la date ISO pour la semaine 'IYYY-"W"IW-ID' à la place de 'IYYY-"W"IW-D'
-- D correspond au jour de la semaine (1-7) en Grégorien. ID correspond au jour ISO.

-- 1. claim_leaderboard_reward
CREATE OR REPLACE FUNCTION public.claim_leaderboard_reward(
    p_user_id uuid,
    p_period_type text,
    p_period_key text
)
RETURNS TABLE(
    success boolean,
    rank_achieved integer,
    plays_awarded integer,
    error_message text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start timestamptz;
    v_end timestamptz;
    v_my_rank bigint;
    v_plays integer := 0;
BEGIN
    -- Déjà réclamé ?
    IF EXISTS(
        SELECT 1 FROM leaderboard_rewards lr
        WHERE lr.user_id = p_user_id
          AND lr.period_type = p_period_type
          AND lr.period_key = p_period_key
    ) THEN
        RETURN QUERY SELECT false, 0, 0, 'Already claimed'::text;
        RETURN;
    END IF;

    -- Calculer la fenêtre de la période (doit être passée)
    IF p_period_type = 'daily' THEN
        v_start := p_period_key::date::timestamptz;
        v_end := v_start + interval '1 day';
    ELSIF p_period_type = 'weekly' THEN
        v_start := to_date(p_period_key || '-1', 'IYYY-"W"IW-ID')::timestamptz;
        v_end := v_start + interval '7 days';
    ELSIF p_period_type = 'monthly' THEN
        v_start := (p_period_key || '-01')::date::timestamptz;
        v_end := v_start + interval '1 month';
    ELSE
        RETURN QUERY SELECT false, 0, 0, 'Invalid period type'::text;
        RETURN;
    END IF;

    IF v_end > now() THEN
        RETURN QUERY SELECT false, 0, 0, 'Period not ended yet'::text;
        RETURN;
    END IF;

    -- Rang du joueur dans cette période
    SELECT r.rk INTO v_my_rank
    FROM (
        SELECT gs.user_id AS uid,
               RANK() OVER (ORDER BY MAX(gs.score) DESC) AS rk
        FROM game_scores gs
        WHERE gs.created_at >= v_start AND gs.created_at < v_end
          AND gs.mode = 'classic'
        GROUP BY gs.user_id
    ) r
    WHERE r.uid = p_user_id;

    IF v_my_rank IS NULL THEN
        RETURN QUERY SELECT false, 0, 0, 'Not ranked in this period'::text;
        RETURN;
    END IF;

    -- Barème de récompenses
    IF p_period_type = 'daily' THEN
        v_plays := CASE v_my_rank WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0 END;
    ELSIF p_period_type = 'weekly' THEN
        v_plays := CASE
            WHEN v_my_rank = 1 THEN 10 WHEN v_my_rank = 2 THEN 7
            WHEN v_my_rank = 3 THEN 5 WHEN v_my_rank <= 5 THEN 3 ELSE 0
        END;
    ELSIF p_period_type = 'monthly' THEN
        v_plays := CASE
            WHEN v_my_rank = 1 THEN 30 WHEN v_my_rank = 2 THEN 20
            WHEN v_my_rank = 3 THEN 15 WHEN v_my_rank <= 5 THEN 10 ELSE 0
        END;
    END IF;

    IF v_plays = 0 THEN
        RETURN QUERY SELECT false, v_my_rank::integer, 0, 'Rank not eligible'::text;
        RETURN;
    END IF;

    -- Enregistrer et accorder
    INSERT INTO leaderboard_rewards (user_id, period_type, period_key, rank, plays_awarded)
    VALUES (p_user_id, p_period_type, p_period_key, v_my_rank, v_plays);

    UPDATE profiles
    SET parties_per_day = parties_per_day + v_plays, updated_at = now()
    WHERE id = p_user_id;

    RETURN QUERY SELECT true, v_my_rank::integer, v_plays, NULL::text;
END;
$$;


-- 2. get_pending_leaderboard_rewards
CREATE OR REPLACE FUNCTION public.get_pending_leaderboard_rewards(p_user_id uuid)
RETURNS TABLE(
    period_type text,
    period_key text,
    rank_achieved integer,
    plays_available integer
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_yesterday text;
    v_last_week text;
    v_last_month text;
    v_rank bigint;
    v_plays integer;
    v_week_start timestamptz;
    v_week_end timestamptz;
    v_month_start timestamptz;
    v_month_end timestamptz;
BEGIN
    v_yesterday := to_char(now() - interval '1 day', 'YYYY-MM-DD');
    v_last_week := to_char(now() - interval '7 days', 'IYYY-"W"IW');
    v_last_month := to_char(now() - interval '1 month', 'YYYY-MM');

    -- Quotidien (hier)
    IF NOT EXISTS(
        SELECT 1 FROM leaderboard_rewards lr
        WHERE lr.user_id = p_user_id AND lr.period_type = 'daily' AND lr.period_key = v_yesterday
    ) THEN
        SELECT r.rk INTO v_rank
        FROM (
            SELECT gs.user_id AS uid, RANK() OVER (ORDER BY MAX(gs.score) DESC) AS rk
            FROM game_scores gs
            WHERE gs.created_at >= v_yesterday::date::timestamptz
              AND gs.created_at < (v_yesterday::date + 1)::timestamptz
              AND gs.mode = 'classic'
            GROUP BY gs.user_id
        ) r WHERE r.uid = p_user_id;

        IF v_rank IS NOT NULL AND v_rank <= 3 THEN
            v_plays := CASE v_rank WHEN 1 THEN 3 WHEN 2 THEN 2 WHEN 3 THEN 1 ELSE 0 END;
            RETURN QUERY SELECT 'daily'::text, v_yesterday, v_rank::integer, v_plays;
        END IF;
    END IF;

    -- Hebdomadaire (semaine dernière)
    IF NOT EXISTS(
        SELECT 1 FROM leaderboard_rewards lr
        WHERE lr.user_id = p_user_id AND lr.period_type = 'weekly' AND lr.period_key = v_last_week
    ) THEN
        v_week_start := to_date(v_last_week || '-1', 'IYYY-"W"IW-ID')::timestamptz;
        v_week_end := v_week_start + interval '7 days';
        IF v_week_end <= now() THEN
            SELECT r.rk INTO v_rank
            FROM (
                SELECT gs.user_id AS uid, RANK() OVER (ORDER BY MAX(gs.score) DESC) AS rk
                FROM game_scores gs
                WHERE gs.created_at >= v_week_start AND gs.created_at < v_week_end
                  AND gs.mode = 'classic'
                GROUP BY gs.user_id
            ) r WHERE r.uid = p_user_id;

            IF v_rank IS NOT NULL AND v_rank <= 5 THEN
                v_plays := CASE
                    WHEN v_rank = 1 THEN 10 WHEN v_rank = 2 THEN 7
                    WHEN v_rank = 3 THEN 5 WHEN v_rank <= 5 THEN 3 ELSE 0
                END;
                RETURN QUERY SELECT 'weekly'::text, v_last_week, v_rank::integer, v_plays;
            END IF;
        END IF;
    END IF;

    -- Mensuel (mois dernier)
    IF NOT EXISTS(
        SELECT 1 FROM leaderboard_rewards lr
        WHERE lr.user_id = p_user_id AND lr.period_type = 'monthly' AND lr.period_key = v_last_month
    ) THEN
        v_month_start := (v_last_month || '-01')::date::timestamptz;
        v_month_end := v_month_start + interval '1 month';
        IF v_month_end <= now() THEN
            SELECT r.rk INTO v_rank
            FROM (
                SELECT gs.user_id AS uid, RANK() OVER (ORDER BY MAX(gs.score) DESC) AS rk
                FROM game_scores gs
                WHERE gs.created_at >= v_month_start AND gs.created_at < v_month_end
                  AND gs.mode = 'classic'
                GROUP BY gs.user_id
            ) r WHERE r.uid = p_user_id;

            IF v_rank IS NOT NULL AND v_rank <= 5 THEN
                v_plays := CASE
                    WHEN v_rank = 1 THEN 30 WHEN v_rank = 2 THEN 20
                    WHEN v_rank = 3 THEN 15 WHEN v_rank <= 5 THEN 10 ELSE 0
                END;
                RETURN QUERY SELECT 'monthly'::text, v_last_month, v_rank::integer, v_plays;
            END IF;
        END IF;
    END IF;
END;
$$;

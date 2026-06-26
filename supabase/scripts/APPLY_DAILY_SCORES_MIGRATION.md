# Guide d'installation de la fonctionnalité Scores du Jour

## Étape 1: Exécuter la migration SQL

Ouvrez l'éditeur SQL Supabase et exécutez le contenu du fichier suivant:
`supabase/migrations/20260626150000_daily_scores_management.sql`

Ou copiez-collez ce SQL directement dans l'éditeur:

```sql
-- Créer une vue pour les scores du jour
CREATE OR REPLACE VIEW daily_scores_view AS
SELECT 
    user_id,
    display_name,
    MAX(score) as daily_score,
    COUNT(*) as games_played_today,
    DATE(created_at) as score_date,
    MAX(created_at) as last_game_at
FROM game_scores
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY user_id, display_name, DATE(created_at)
ORDER BY daily_score DESC;

-- Créer une fonction RPC pour récupérer les scores du jour avec pagination
CREATE OR REPLACE FUNCTION get_daily_scores(p_offset INTEGER DEFAULT 0, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    daily_score INTEGER,
    games_played_today INTEGER,
    score_date DATE,
    last_game_at TIMESTAMP WITH TIME ZONE,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_count BIGINT;
BEGIN
    -- Compter le total
    SELECT COUNT(*) INTO v_total_count
    FROM (
        SELECT DISTINCT user_id
        FROM game_scores
        WHERE DATE(created_at) = CURRENT_DATE
    ) sub;
    
    -- Retourner les résultats avec le total
    RETURN QUERY
    SELECT 
        ds.user_id,
        ds.display_name,
        ds.daily_score,
        ds.games_played_today,
        ds.score_date,
        ds.last_game_at,
        v_total_count
    FROM daily_scores_view ds
    ORDER BY ds.daily_score DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Créer une fonction RPC pour modifier le score du jour d'un utilisateur
CREATE OR REPLACE FUNCTION update_daily_score(
    p_user_id UUID,
    p_new_score INTEGER,
    p_admin_id UUID DEFAULT auth.uid()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_updated_count INTEGER;
BEGIN
    -- Vérifier si l'utilisateur est admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = p_admin_id;
    
    IF NOT FOUND OR v_is_admin = false THEN
        RETURN json_build_object('success', false, 'error', 'Non autorisé: admin requis');
    END IF;
    
    -- Trouver le score du jour le plus élevé pour cet utilisateur
    UPDATE game_scores
    SET score = p_new_score
    WHERE id = (
        SELECT id
        FROM game_scores
        WHERE user_id = p_user_id
        AND DATE(created_at) = CURRENT_DATE
        ORDER BY score DESC
        LIMIT 1
    );
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count = 0 THEN
        -- Aucun score trouvé pour aujourd'hui, en créer un nouveau
        INSERT INTO game_scores (user_id, display_name, score, mode)
        SELECT p_user_id, display_name, p_new_score, 'classic'
        FROM profiles
        WHERE id = p_user_id;
        
        RETURN json_build_object('success', true, 'message', 'Nouveau score créé', 'action', 'created');
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Score mis à jour', 'action', 'updated', 'rows_affected', v_updated_count);
END;
$$;

-- Accorder les permissions
GRANT SELECT ON daily_scores_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_scores TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_score TO authenticated;
```

## Étape 2: Vérifier l'installation

Exécutez cette requête pour vérifier que tout fonctionne:

```sql
SELECT * FROM get_daily_scores(0, 10);
```

Vous devriez voir les scores du jour des joueurs.

## Étape 3: Tester dans l'admin web

1. Lancez l'admin web localement: `cd admin_web && npm run dev`
2. Connectez-vous en tant qu'admin
3. Cliquez sur "Scores du Jour" dans le menu
4. Vous devriez voir la liste des scores du jour avec possibilité de les modifier

-- Migration: Hybrid Intelligent Fetching (RPC)
-- Objectif: Déporter le filtrage (Notoriété, BC, Semantic Shield) sur Supabase

CREATE OR REPLACE FUNCTION public.fetch_intelligent_events(
    p_last_event_ids uuid[],
    p_limit int DEFAULT 20,
    p_notoriete_min int DEFAULT 50,
    p_min_year int DEFAULT 0
)
RETURNS SETOF public.evenements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_last_event_id uuid;
    v_reference_embedding vector(1536);
BEGIN
    -- 1. Obtenir l'ID du dernier événement joué pour le Semantic Shield
    IF array_length(p_last_event_ids, 1) > 0 THEN
        -- On prend le tout dernier événement de la liste comme référence principale
        v_last_event_id := p_last_event_ids[array_length(p_last_event_ids, 1)];
        
        -- Récupérer son embedding textuel
        SELECT embedding_1536 INTO v_reference_embedding
        FROM public.evenements_embeddings
        WHERE id = v_last_event_id AND source_type = 'titre'
        LIMIT 1;
    END IF;

    -- 2. Sélection Intelligente
    IF v_reference_embedding IS NOT NULL THEN
        -- Avec Semantic Shield (éloignement thématique)
        RETURN QUERY
        SELECT e.*
        FROM public.evenements e
        JOIN public.evenements_embeddings ee ON e.id = ee.id AND ee.source_type = 'titre'
        WHERE e.notoriete_fr >= p_notoriete_min
          -- CONSTRAINT CRITIQUE : Exclusion des années BC (Avant J.-C.)
          AND EXTRACT(YEAR FROM e.date) >= p_min_year
          -- Exclusion stricte des événements déjà joués
          AND NOT (e.id = ANY(p_last_event_ids))
          AND ee.embedding_1536 IS NOT NULL
        ORDER BY 
            -- Le Semantic Shield : On trie par distance DESC (plus c'est loin sémantiquement, mieux c'est)
            -- L'opérateur <-> calcule la distance L2 (euclidienne) entre les vecteurs
            (ee.embedding_1536 <-> v_reference_embedding) DESC,
            -- Second critère : On sécurise avec les plus notoires parmi ceux qui sont éloignés
            e.notoriete_fr DESC
        LIMIT p_limit;
    ELSE
        -- Fallback classique (premier tour ou pas d'embedding disponible)
        RETURN QUERY
        SELECT e.*
        FROM public.evenements e
        WHERE e.notoriete_fr >= p_notoriete_min
          AND EXTRACT(YEAR FROM e.date) >= p_min_year
          AND (p_last_event_ids IS NULL OR NOT (e.id = ANY(p_last_event_ids)))
        ORDER BY 
            RANDOM() -- Mélange aléatoire initial
        LIMIT p_limit;
    END IF;
END;
$$;

-- Ajout d'un index pour optimiser la recherche de notoriété et de date
-- S'ils n'existent pas déjà
CREATE INDEX IF NOT EXISTS idx_evenements_notoriete_date 
ON public.evenements (notoriete_fr DESC, date);

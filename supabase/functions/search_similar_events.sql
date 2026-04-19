-- Fonction de recherche vectorielle optimisée pour les événements
-- À exécuter dans l'éditeur SQL Supabase

-- OBSOLÈTE : remplacé par match_evenements_by_titre (voir migrations)
-- Cette fonction est conservée pour référence uniquement.
-- Utiliser : SELECT * FROM match_evenements_by_titre(query_embedding, match_count, match_threshold);
CREATE OR REPLACE FUNCTION search_similar_events(
  query_vector vector(1536),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  titre text,
  date date,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.titre,
    e.date,
    res.similarity::float
  FROM match_evenements_by_titre(query_vector, match_count, match_threshold) res
  JOIN evenements e ON e.id = res.id;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION search_similar_events TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_events TO anon;

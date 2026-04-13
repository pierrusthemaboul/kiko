-- Fonction de recherche vectorielle optimisée pour les événements
-- À exécuter dans l'éditeur SQL Supabase

CREATE OR REPLACE FUNCTION search_similar_events(
  query_vector vector(1536),  -- 1536 dimensions pour ada-002
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
    1 - (e.embedding_vocal <=> query_vector) as similarity
  FROM evenements e
  WHERE e.embedding_vocal IS NOT NULL
    AND (1 - (e.embedding_vocal <=> query_vector)) > match_threshold
  ORDER BY e.embedding_vocal <=> query_vector
  LIMIT match_count;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION search_similar_events TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_events TO anon;

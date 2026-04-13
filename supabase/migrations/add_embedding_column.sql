-- Ajouter une colonne embedding avec le bon modèle
-- À exécuter dans l'éditeur SQL Supabase

-- 1. Ajouter la colonne embedding_openai (1536 dimensions)
ALTER TABLE evenements 
ADD COLUMN IF NOT EXISTS embedding_openai vector(1536);

-- 2. Créer un index pour la recherche rapide
CREATE INDEX IF NOT EXISTS idx_evenements_embedding_openai 
ON evenements 
USING ivfflat (embedding_openai vector_cosine_ops);

-- 3. Fonction de recherche vectorielle corrigée
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
    1 - (e.embedding_openai <=> query_vector) as similarity
  FROM evenements e
  WHERE e.embedding_openai IS NOT NULL
    AND (1 - (e.embedding_openai <=> query_vector)) > match_threshold
  ORDER BY e.embedding_openai <=> query_vector
  LIMIT match_count;
END;
$$;

-- 4. Donner les permissions
GRANT EXECUTE ON FUNCTION search_similar_events TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_events TO anon;

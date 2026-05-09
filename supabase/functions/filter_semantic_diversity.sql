-- Fonction pour filtrer les événements par diversité sémantique
-- Évite les répétitions visuelles en utilisant les embeddings d'images
-- À exécuter dans l'éditeur SQL Supabase

CREATE OR REPLACE FUNCTION filter_events_by_semantic_diversity(
  p_ref_event_id UUID,
  p_candidate_ids UUID[],
  p_similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE(
  event_id UUID,
  is_diverse BOOLEAN,
  similarity_score FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  ref_embedding vector(768);
BEGIN
  -- Récupérer l'embedding de l'événement de référence (image)
  SELECT embedding_768 INTO ref_embedding
  FROM evenements_embeddings ee
  WHERE ee.id = p_ref_event_id
    AND ee.source_type = 'image'
    AND ee.embedding_768 IS NOT NULL
  LIMIT 1;
  
  -- Si pas d'embedding, retourner tous les candidats comme diverses
  IF ref_embedding IS NULL THEN
    RETURN QUERY
    SELECT 
      unnest(p_candidate_ids) as event_id,
      true as is_diverse,
      0.0 as similarity_score;
    RETURN;
  END IF;
  
  -- Pour chaque candidat, calculer la similarité
  RETURN QUERY
  SELECT 
    ee.id as event_id,
    CASE 
      WHEN (1 - (ee.embedding_768 <=> ref_embedding)) < p_similarity_threshold THEN true
      ELSE false
    END as is_diverse,
    (1 - (ee.embedding_768 <=> ref_embedding)) as similarity_score
  FROM evenements_embeddings ee
  WHERE ee.id = ANY(p_candidate_ids)
    AND ee.source_type = 'image'
    AND ee.embedding_768 IS NOT NULL;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION filter_events_by_semantic_diversity TO authenticated;
GRANT EXECUTE ON FUNCTION filter_events_by_semantic_diversity TO anon;

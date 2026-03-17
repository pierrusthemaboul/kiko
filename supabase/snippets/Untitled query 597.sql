-- Activer pgvector en local
CREATE EXTENSION IF NOT EXISTS vector;

-- Table embeddings pour labo (local)
CREATE TABLE IF NOT EXISTS public.labo_embeddings (
  id bigint NOT NULL,
  titre_vector vector(1536),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT labo_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT labo_embeddings_id_fkey FOREIGN KEY (id) REFERENCES public.labo(id) ON DELETE CASCADE
);

-- Index vectoriel pour labo
CREATE INDEX IF NOT EXISTS idx_labo_embeddings_vector
  ON public.labo_embeddings USING ivfflat (titre_vector vector_cosine_ops) WITH (lists = 100);

-- Fonction de recherche pour labo
CREATE OR REPLACE FUNCTION public.match_labo_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 1
)
RETURNS TABLE (id bigint, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT le.id, (1 - (le.titre_vector <=> query_embedding)) as similarity
  FROM public.labo_embeddings le
  WHERE le.titre_vector IS NOT NULL
  ORDER BY le.titre_vector <=> query_embedding
  LIMIT match_count;
$$;
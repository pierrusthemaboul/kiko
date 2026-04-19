create extension if not exists vector;

-- Schéma sidecar unifié (source_type x model_name par événement)
create table if not exists public.evenements_embeddings (
  id          uuid not null references public.evenements(id) on delete cascade,
  source_type text not null,  -- 'titre' | 'image'
  model_name  text,           -- 'text-embedding-3-small' | 'multimodalembedding@001'
  embedding_1536 vector(1536),
  embedding_768  vector(768),
  metadata    jsonb,
  created_at  timestamp with time zone default now(),
  updated_at  timestamp with time zone default now(),
  constraint evenements_embeddings_pkey primary key (id, source_type)
);

create index if not exists idx_evenements_embeddings_1536
  on public.evenements_embeddings using ivfflat (embedding_1536 vector_cosine_ops)
  where source_type = 'titre';

create index if not exists idx_evenements_embeddings_768
  on public.evenements_embeddings using ivfflat (embedding_768 vector_cosine_ops)
  where source_type = 'image';

create extension if not exists vector;

create table if not exists public.evenements_embeddings (
  id uuid not null,
  titre_vector vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint evenements_embeddings_pkey primary key (id),
  constraint evenements_embeddings_id_fkey foreign key (id) references public.evenements(id) on delete cascade
);

create index if not exists idx_evenements_embeddings_vector
  on public.evenements_embeddings using ivfflat (titre_vector vector_cosine_ops);

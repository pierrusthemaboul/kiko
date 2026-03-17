-- 1. Active l'extension pour les vecteurs
create extension if not exists vector;

-- 2. Crée la table pour tes 2074 événements locaux
create table if not exists public.labo_embeddings (
  id bigint not null,
  titre_vector vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint labo_embeddings_pkey primary key (id),
  constraint labo_embeddings_id_fkey
    foreign key (id) references public.labo(id) on delete cascade
);

-- 3. Crée l'index pour des recherches rapides
create index if not exists idx_labo_embeddings_vector
  on public.labo_embeddings 
  using ivfflat (titre_vector vector_cosine_ops) 
  with (lists = 100);
-- Migration pour configurer les embeddings avec pgvector
-- Basé sur machine_a_evenements/tempete/setup_embeddings.sql

-- Activer l'extension pgvector
create extension if not exists vector;

-- Créer les tables d'embeddings
create table if not exists public.evenements_embeddings (
  id uuid not null,
  titre_vector vector(1536),
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint evenements_embeddings_pkey primary key (id),
  constraint evenements_embeddings_id_fkey
    foreign key (id) references public.evenements(id) on delete cascade
);

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

-- Créer les indexes vectoriels pour la recherche rapide
create index if not exists idx_evenements_embeddings_vector
  on public.evenements_embeddings using ivfflat (titre_vector vector_cosine_ops) with (lists = 100);

create index if not exists idx_labo_embeddings_vector
  on public.labo_embeddings using ivfflat (titre_vector vector_cosine_ops) with (lists = 100);

-- Créer les fonctions de recherche par similarité
create or replace function public.match_evenements_embeddings(
  query_embedding vector(1536),
  match_count int default 1
)
returns table (
  id uuid,
  similarity double precision
)
language sql
stable
as $$
  select
    ee.id,
    (1 - (ee.titre_vector <=> query_embedding)) as similarity
  from public.evenements_embeddings ee
  where ee.titre_vector is not null
  order by ee.titre_vector <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_labo_embeddings(
  query_embedding vector(1536),
  match_count int default 1
)
returns table (
  id bigint,
  similarity double precision
)
language sql
stable
as $$
  select
    le.id,
    (1 - (le.titre_vector <=> query_embedding)) as similarity
  from public.labo_embeddings le
  where le.titre_vector is not null
  order by le.titre_vector <=> query_embedding
  limit match_count;
$$;

-- Donner les permissions nécessaires
grant delete, insert, references, select, trigger, truncate, update on table public.evenements_embeddings to anon;
grant delete, insert, references, select, trigger, truncate, update on table public.evenements_embeddings to authenticated;
grant delete, insert, references, select, trigger, truncate, update on table public.evenements_embeddings to service_role;

grant delete, insert, references, select, trigger, truncate, update on table public.labo_embeddings to anon;
grant delete, insert, references, select, trigger, truncate, update on table public.labo_embeddings to authenticated;
grant delete, insert, references, select, trigger, truncate, update on table public.labo_embeddings to service_role;

-- Rendre les fonctions accessibles
grant execute on function public.match_evenements_embeddings to anon;
grant execute on function public.match_evenements_embeddings to authenticated;
grant execute on function public.match_evenements_embeddings to service_role;

grant execute on function public.match_labo_embeddings to anon;
grant execute on function public.match_labo_embeddings to authenticated;
grant execute on function public.match_labo_embeddings to service_role;

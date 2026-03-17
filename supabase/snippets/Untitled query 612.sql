create extension if not exists vector;

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

create index if not exists idx_evenements_embeddings_vector
  on public.evenements_embeddings using ivfflat (titre_vector vector_cosine_ops) with (lists = 100);

create index if not exists idx_labo_embeddings_vector
  on public.labo_embeddings using ivfflat (titre_vector vector_cosine_ops) with (lists = 100);

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

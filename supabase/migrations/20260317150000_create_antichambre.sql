-- Migration: Create antichambre table
-- Purpose: Acts as a final verification step before events enter the main 'evenements' table.
-- Exactly the same structure as 'evenements'.

create table if not exists public.antichambre (
  id uuid not null default extensions.uuid_generate_v4 (),
  date date not null,
  titre text not null,
  illustration_url text null,
  universel boolean not null,
  region character varying(100) null,
  langue character varying(50) not null,
  ecart_temps_max integer not null,
  facteur_variation double precision not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  niveau_difficulte integer null,
  types_evenement text[] null,
  pays text[] null,
  epoque text null,
  mots_cles text[] null,
  date_formatee text null,
  code text null,
  date_precision character varying(5) null,
  ecart_temps_min integer null,
  frequency_score integer null default 0,
  last_used timestamp with time zone null,
  description_detaillee text null,
  donnee_corrigee boolean not null default false,
  notoriete smallint null,
  notoriete_prev smallint null,
  notoriete_source text null,
  notoriete_updated_at timestamp with time zone null default now(),
  notoriete_fr smallint null,
  migration_at timestamp with time zone null,
  source_goju2_id uuid null,
  embedding_vocal public.vector null,
  embedding_image public.vector null,
  constraint antichambre_pkey primary key (id),
  constraint antichambre_unique_code unique (code),
  constraint antichambre_notoriete_check check (
    (
      (notoriete >= 0)
      and (notoriete <= 100)
    )
  )
);

-- Indexes for performance
create index IF not exists idx_antichambre_date on public.antichambre using btree (date);
create index IF not exists idx_antichambre_difficulte_date on public.antichambre using btree (niveau_difficulte, date);
create index IF not exists idx_antichambre_frequency_score on public.antichambre using btree (frequency_score);
create index IF not exists idx_antichambre_last_used on public.antichambre using btree (last_used desc);
create index IF not exists idx_antichambre_notoriete on public.antichambre using btree (notoriete);
create index IF not exists idx_antichambre_notoriete_fr on public.antichambre using btree (notoriete_fr);
create index IF not exists idx_antichambre_region on public.antichambre using btree (region);
create index IF not exists idx_antichambre_universel on public.antichambre using btree (universel);

-- Vector indexes (assuming 'vector' extension is enabled in 'extensions' or 'public' as in 'evenements')
create index IF not exists antichambre_embedding_vocal_idx on public.antichambre using ivfflat (embedding_vocal vector_cosine_ops) with (lists = '100');
create index IF not exists antichambre_embedding_image_idx on public.antichambre using ivfflat (embedding_image vector_cosine_ops) with (lists = '100');

-- Trigger for automatic update of updated_at
-- We use the same function as 'evenements' if it exists.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
        create trigger update_antichambre_modtime BEFORE
        update on antichambre for EACH row
        execute FUNCTION update_modified_column ();
    END IF;
END $$;

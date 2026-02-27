-- Migration: Create evenements_audit table
-- Purpose: Store audit results — READ ONLY on evenements, WRITE ONLY here
-- Pipeline: SCOREUR (Gemini) → BLIND_DATER (Claude Haiku) → COMPARATEUR (code) → ARBITRE (Claude Sonnet)

create table if not exists public.evenements_audit (
  id uuid not null default extensions.uuid_generate_v4(),

  -- Reference to production event (never modified)
  evenement_id uuid not null,

  -- PHASE 1: SCOREUR (Gemini 2 Flash) — confidence scoring
  score_confiance integer check (score_confiance >= 0 and score_confiance <= 100),
  flags text[],
  score_reason text,
  scored_at timestamp with time zone,

  -- PHASE 3: BLIND_DATER (Claude Haiku) — date estimation without original date
  blind_date_year integer,
  blind_date_min integer,
  blind_date_max integer,
  blind_date_confidence integer,
  blind_date_reasoning text,
  blind_dated_at timestamp with time zone,

  -- PHASE 4: COMPARATEUR (code) — delta between original and blind date
  original_year integer,
  delta_years integer,
  statut varchar(10) check (statut in ('vert', 'orange', 'rouge')),
  compared_at timestamp with time zone,

  -- PHASE 5: ARBITRE (Claude Sonnet) — verdict on contested cases
  verdict text check (verdict in ('DATE_ORIGINALE_CORRECTE', 'BLIND_DATE_PLUS_PROBABLE', 'INCERTAIN', 'ERREUR_GRAVE')),
  verdict_confidence integer,
  correction_suggeree text,
  arbitrated_at timestamp with time zone,

  -- Metadata
  audited_at timestamp with time zone not null default now(),
  audit_version integer not null default 1,

  constraint evenements_audit_pkey primary key (id),
  constraint evenements_audit_unique unique (evenement_id, audit_version),
  constraint evenements_audit_evenement_id_fkey
    foreign key (evenement_id) references public.evenements(id)
);

create index if not exists idx_evenements_audit_evenement_id
  on public.evenements_audit (evenement_id);

create index if not exists idx_evenements_audit_score
  on public.evenements_audit (score_confiance);

create index if not exists idx_evenements_audit_statut
  on public.evenements_audit (statut);

create index if not exists idx_evenements_audit_verdict
  on public.evenements_audit (verdict);

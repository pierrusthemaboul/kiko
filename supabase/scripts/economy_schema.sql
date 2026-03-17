-- PROFILES -------------------------------------------------------------
-- Colonnes (avec valeurs par défaut et NOT NULL)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total int DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS title_key text DEFAULT 'page';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parties_per_day int DEFAULT 3;

-- Backfill valeurs nulles avant NOT NULL
UPDATE public.profiles SET xp_total = 0 WHERE xp_total IS NULL;
UPDATE public.profiles SET title_key = 'page' WHERE title_key IS NULL;
UPDATE public.profiles SET parties_per_day = 3 WHERE parties_per_day IS NULL;

-- Contraintes
ALTER TABLE public.profiles
  ALTER COLUMN xp_total SET NOT NULL,
  ALTER COLUMN title_key SET NOT NULL,
  ALTER COLUMN parties_per_day SET NOT NULL;

-- Optionnel : borne raisonnable du nombre de parties/jour
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_parties_per_day_range_ck'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_parties_per_day_range_ck
      CHECK (parties_per_day BETWEEN 1 AND 12);
  END IF;
END$$;

-- Index utile pour filtres/joins
CREATE INDEX IF NOT EXISTS idx_profiles_title_key ON public.profiles (title_key);

-- RUNS -----------------------------------------------------------------
-- Colonnes d’empreinte économie en fin de partie (toutes optionnelles)
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS xp_earned int;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS old_xp int;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS new_xp int;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS rank_key text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS rank_label text;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS parties_per_day int;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS leveled_up boolean;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS economy_applied_at timestamptz;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Contrainte de domaine sur mode si elle n’existe pas (classic|date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name = 'runs_mode_domain_ck'
  ) THEN
    ALTER TABLE public.runs
      ADD CONSTRAINT runs_mode_domain_ck
      CHECK (mode IN ('classic','date'));
  END IF;
END$$;

-- Index pour comptage quotidien et requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_runs_user_created_at ON public.runs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_runs_economy_applied_at ON public.runs (economy_applied_at);

-- (Optionnel) Clé d’idem-potence si vous en ajoutez une plus tard :
-- ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS idempotency_key text;
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_runs_user_idem ON public.runs (user_id, idempotency_key);

-- RLS (à adapter si nécessaire) : l’utilisateur lit/écrit ses runs, lecture libre des agrégats serveur
-- (laisser en l’état si déjà configuré ailleurs)

-- FIN DU SCRIPT

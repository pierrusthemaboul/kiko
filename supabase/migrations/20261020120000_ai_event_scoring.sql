-- Migration: ai_event_scoring
-- Stocke les scores IA pré-calculés (batch offline) pour la sélection classique :
--   1) evenements_scores_ia  : notoriété recalibrée par IA (consensus multi-modèles)
--   2) evenements_paires     : jouabilité d'une paire (A avant B ?) — deviabilité/confusabilité
-- Aucun appel IA en jeu : l'app ne fait que lire ces tables.

-- 1. Scores de notoriété IA par événement
CREATE TABLE IF NOT EXISTS public.evenements_scores_ia (
    event_id uuid PRIMARY KEY REFERENCES public.evenements(id) ON DELETE CASCADE,
    notoriety_ai smallint NOT NULL,          -- score consensuel (moyenne des juges)
    notoriety_ai_gemini smallint,            -- score brut du juge Gemini
    notoriety_ai_deepseek smallint,          -- score brut du juge DeepSeek
    delta_vs_notoriete smallint,             -- notoriety_ai - notoriete_fr
    confidence smallint,                     -- confiance min des juges (0-100)
    reason text,                             -- justification (1 phrase)
    scored_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Scores de paires : la question "lequel est arrivé en premier ?" est-elle posable ?
--    Clé normalisée : a_id < b_id (ordre alphabétique des uuid).
CREATE TABLE IF NOT EXISTS public.evenements_paires (
    a_id uuid NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
    b_id uuid NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
    guessability smallint NOT NULL,          -- 0-100 : proba qu'un joueur FR moyen ordonne correctement
    confusability smallint NOT NULL,         -- 0-100 : risque de confusion (potentiel piège)
    interest smallint,                       -- 0-100 : intérêt pédagogique de la paire
    tag text NOT NULL,                       -- same_period | far_apart | expansion | star_vs_star | ...
    year_gap integer,
    provider text,
    model text,
    scored_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (a_id, b_id),
    CONSTRAINT paires_a_lt_b CHECK (a_id::text < b_id::text)
);

-- Index : retrouver les partenaires d'un événement et filtrer par jouabilité
CREATE INDEX IF NOT EXISTS idx_evenements_paires_b ON public.evenements_paires (b_id);
CREATE INDEX IF NOT EXISTS idx_evenements_paires_guess ON public.evenements_paires (guessability);
CREATE INDEX IF NOT EXISTS idx_evenements_paires_confus ON public.evenements_paires (confusability);

-- RLS : lecture publique (consommé par le client de jeu), écriture réservée au service role
ALTER TABLE public.evenements_scores_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenements_paires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autoriser lecture publique" ON public.evenements_scores_ia FOR SELECT USING (true);
CREATE POLICY "Autoriser lecture publique" ON public.evenements_paires FOR SELECT USING (true);

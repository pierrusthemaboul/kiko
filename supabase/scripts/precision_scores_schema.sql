-- Table pour stocker les scores du mode Précision
CREATE TABLE IF NOT EXISTS public.precision_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Joueur',
  score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_precision_scores_user_id ON public.precision_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_precision_scores_created_at ON public.precision_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precision_scores_score ON public.precision_scores(score DESC);

-- Ajouter la colonne high_score_precision dans profiles si elle n'existe pas
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS high_score_precision int DEFAULT 0;

-- RLS (Row Level Security)
ALTER TABLE public.precision_scores ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre aux utilisateurs de lire tous les scores (pour les leaderboards)
DROP POLICY IF EXISTS "Users can view all precision scores" ON public.precision_scores;
CREATE POLICY "Users can view all precision scores"
  ON public.precision_scores
  FOR SELECT
  USING (true);

-- Policy pour permettre aux utilisateurs d'insérer leurs propres scores
DROP POLICY IF EXISTS "Users can insert their own precision scores" ON public.precision_scores;
CREATE POLICY "Users can insert their own precision scores"
  ON public.precision_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy pour permettre aux utilisateurs de supprimer leurs propres scores
DROP POLICY IF EXISTS "Users can delete their own precision scores" ON public.precision_scores;
CREATE POLICY "Users can delete their own precision scores"
  ON public.precision_scores
  FOR DELETE
  USING (auth.uid() = user_id);

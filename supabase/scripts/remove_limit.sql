-- Suppression de la contrainte qui limite parties_per_day entre 1 et 12
-- Cela permet aux publicités d'ajouter des parties bonus au-delà de la limite initiale.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_parties_per_day_range_ck;

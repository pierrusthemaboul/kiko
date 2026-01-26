-- Vérification: Afficher le profil de Pierrot pour voir si xp_total est NULL

SELECT
  id,
  display_name,
  xp_total,
  games_played,
  current_streak,
  high_score,
  high_score_precision
FROM public.profiles
WHERE id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

-- Vérifier tous les profils avec xp_total NULL
SELECT
  'Profils avec xp_total NULL:' AS info,
  COUNT(*) AS count
FROM public.profiles
WHERE xp_total IS NULL;

-- Si xp_total est NULL, le corriger maintenant
UPDATE public.profiles
SET xp_total = 0
WHERE id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'
AND xp_total IS NULL;

-- Afficher le résultat après correction
SELECT
  id,
  display_name,
  xp_total,
  games_played
FROM public.profiles
WHERE id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

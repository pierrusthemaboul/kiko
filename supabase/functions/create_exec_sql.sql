-- Création de la fonction exec_sql pour permettre les requêtes SQL brutes
-- À exécuter dans l'éditeur SQL Supabase

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS TABLE(
  -- Colonnes génériques, à adapter selon vos besoins
  id bigint,
  titre text,
  date date,
  similarity double precision,
  -- Ajoutez d'autres colonnes si nécessaire
  result jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Exécuter la requête SQL dynamiquement
  -- Attention: cette fonction est puissante et doit être utilisée avec précaution
  RETURN QUERY EXECUTE sql;
  
  -- Si la requête ne retourne pas les colonnes attendues, on retourne un résultat par défaut
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::bigint, NULL::text, NULL::date, NULL::double precision, NULL::jsonb;
  END IF;
END;
$$;

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql TO anon;

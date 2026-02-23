-- Ajout de la colonne app_version à la table user_event_usage
ALTER TABLE public.user_event_usage ADD COLUMN IF NOT EXISTS app_version text;

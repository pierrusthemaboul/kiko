-- Fix pour la publication remote_control déjà existante
-- Supprimer d'abord la table de la publication si elle y est déjà
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'remote_control'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE remote_control;
    END IF;
END $$;

-- Puis l'ajouter correctement
ALTER PUBLICATION supabase_realtime ADD TABLE remote_control;
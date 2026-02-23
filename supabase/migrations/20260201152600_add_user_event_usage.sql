-- Table pour stocker l'historique personnel de chaque joueur
CREATE TABLE IF NOT EXISTS public.user_event_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id uuid REFERENCES public.evenements(id) ON DELETE CASCADE NOT NULL,
    last_seen_at timestamptz DEFAULT now() NOT NULL,
    times_seen int DEFAULT 1 NOT NULL,
    UNIQUE(user_id, event_id)
);

-- Index pour la lecture rapide
CREATE INDEX IF NOT EXISTS idx_user_usage_lookup ON public.user_event_usage (user_id, last_seen_at DESC);

-- Sécurité RLS
ALTER TABLE public.user_event_usage ENABLE ROW LEVEL SECURITY;

-- Politiques (utilisant DO pour éviter les erreurs si elles existent déjà)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own event usage') THEN
        CREATE POLICY "Users can see their own event usage" ON public.user_event_usage FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can record their own event usage') THEN
        CREATE POLICY "Users can record their own event usage" ON public.user_event_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own event usage') THEN
        CREATE POLICY "Users can update their own event usage" ON public.user_event_usage FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END
$$;

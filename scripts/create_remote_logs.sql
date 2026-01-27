-- Migration pour créer la table de logs à distance (Sentinelles)
CREATE TABLE IF NOT EXISTS public.remote_debug_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    app_version TEXT,
    platform TEXT
);

-- Index pour accélérer les recherches par catégorie et date
CREATE INDEX IF NOT EXISTS idx_remote_debug_logs_category ON public.remote_debug_logs(category);
CREATE INDEX IF NOT EXISTS idx_remote_debug_logs_created_at ON public.remote_debug_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_remote_debug_logs_user_id ON public.remote_debug_logs(user_id);

-- Activer RLS
ALTER TABLE public.remote_debug_logs ENABLE ROW LEVEL SECURITY;

-- Autoriser l'insertion anonyme ou authentifiée (pour capturer les erreurs même hors ligne/invité)
-- NOTE: En prod, on pourra restreindre si abus, mais pour le debug c'est nécessaire.
CREATE POLICY "Enable insert for all users" ON public.remote_debug_logs
    FOR INSERT WITH CHECK (true);

-- Seul l'admin peut lire les logs (via le dashboard Supabase)
CREATE POLICY "Enable select for admin only" ON public.remote_debug_logs
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

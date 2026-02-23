
-- Ajout de colonnes pour le support de l'IA si nécessaire
-- (La table actuelle suffit, on va juste utiliser de nouveaux types)

-- On s'assure que le Realtime est bien actif pour les nouveaux types de messages
-- On peut aussi créer une table dédiée aux conversations IA pour ne pas polluer les logs de commandes
CREATE TABLE IF NOT EXISTS public.ai_chat (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    role text NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content text,
    session_id text,
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Activation du Realtime pour le chat IA
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat;

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_ai_chat_session ON public.ai_chat(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_created_at ON public.ai_chat(created_at);

ALTER TABLE public.ai_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all ai chat" ON public.ai_chat FOR ALL USING (true) WITH CHECK (true);

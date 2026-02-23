
-- Table pour le contrôle à distance de la machine à événements
CREATE TABLE IF NOT EXISTS public.remote_control (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    type text NOT NULL, -- 'command', 'input', 'output', 'status'
    content text,
    session_id text,
    status text DEFAULT 'pending'
);

-- Activation du Realtime pour cette table
ALTER PUBLICATION supabase_realtime ADD TABLE remote_control;

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_remote_control_session ON public.remote_control(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_control_created_at ON public.remote_control(created_at);

-- Sécurité : On autorise tout pour le moment pour faciliter le setup, 
-- mais à terme on pourrait restreindre.
ALTER TABLE public.remote_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for now" ON public.remote_control FOR ALL USING (true) WITH CHECK (true);

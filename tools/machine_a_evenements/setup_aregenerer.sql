CREATE TABLE IF NOT EXISTS public.aregenerer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evenement_id UUID NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
    titre TEXT NOT NULL,
    year INT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Désactivation de la sécurité RLS pour que l'application React puisse écrire dedans facilement
ALTER TABLE public.aregenerer DISABLE ROW LEVEL SECURITY;

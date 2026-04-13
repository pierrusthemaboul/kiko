
-- Migration: create_evenements_signalements
-- Purpose: Allow users to report errors in events (dates, typos, images, etc.)

CREATE TABLE IF NOT EXISTS public.evenements_signalements (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    evenement_id uuid NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    type_erreur text NOT NULL, -- 'DATE_FAUSSE', 'DESCRIPTION_FAUSSE', 'IMAGE_INCOHERENTE', 'TYPO', 'AUTRE'
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'IGNORED'))
);

-- RLS
ALTER TABLE public.evenements_signalements ENABLE ROW LEVEL SECURITY;

-- Allow anyone to report (even guests/unauthenticated)
CREATE POLICY "Allow anyone to insert reports" 
ON public.evenements_signalements FOR INSERT 
TO public
WITH CHECK (true);

-- Allow admins to view all reports
CREATE POLICY "Admins can view all reports" 
ON public.evenements_signalements FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

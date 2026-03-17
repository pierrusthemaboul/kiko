CREATE TABLE IF NOT EXISTS public.queue_sevent (
    id bigserial PRIMARY KEY,
    titre text NOT NULL,
    year integer NOT NULL,
    type text,
    region text,
    description text,
    specific_location text,
    notoriete integer,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    error_log text,
    validation_notes jsonb
);

COMMENT ON TABLE public.queue_sevent IS 'File d''attente pour la génération d''images par la machine sevent3';

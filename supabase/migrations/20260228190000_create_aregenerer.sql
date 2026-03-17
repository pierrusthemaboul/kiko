-- ============================================================
-- Table: aregenerer
-- Queue for requesting illustration regeneration.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.aregenerer (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evenement_id uuid NOT NULL REFERENCES public.evenements(id) ON DELETE CASCADE,
    titre text NOT NULL,
    year int NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.aregenerer ENABLE ROW LEVEL SECURITY;

-- Admin-only access (matches current UI check based on email)
DO $$
BEGIN
  -- Drop policies if they exist (idempotent)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'aregenerer' AND policyname = 'aregenerer_admin_select'
  ) THEN
    DROP POLICY aregenerer_admin_select ON public.aregenerer;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'aregenerer' AND policyname = 'aregenerer_admin_insert'
  ) THEN
    DROP POLICY aregenerer_admin_insert ON public.aregenerer;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'aregenerer' AND policyname = 'aregenerer_admin_update'
  ) THEN
    DROP POLICY aregenerer_admin_update ON public.aregenerer;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'aregenerer' AND policyname = 'aregenerer_admin_delete'
  ) THEN
    DROP POLICY aregenerer_admin_delete ON public.aregenerer;
  END IF;
END $$;

CREATE POLICY aregenerer_admin_select
ON public.aregenerer
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'pierre.cousin7@gmail.com'
);

CREATE POLICY aregenerer_admin_insert
ON public.aregenerer
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email') = 'pierre.cousin7@gmail.com'
);

CREATE POLICY aregenerer_admin_update
ON public.aregenerer
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'pierre.cousin7@gmail.com'
)
WITH CHECK (
  (auth.jwt() ->> 'email') = 'pierre.cousin7@gmail.com'
);

CREATE POLICY aregenerer_admin_delete
ON public.aregenerer
FOR DELETE
TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'pierre.cousin7@gmail.com'
);

CREATE INDEX IF NOT EXISTS idx_aregenerer_status_created_at
ON public.aregenerer (status, created_at);

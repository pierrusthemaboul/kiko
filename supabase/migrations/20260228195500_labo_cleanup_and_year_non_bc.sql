-- Ensure no BC years in labo (denicheur staging)

DELETE FROM public.labo
WHERE year IS NOT NULL AND year < 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'labo_year_non_bc'
      AND conrelid = 'public.labo'::regclass
  ) THEN
    ALTER TABLE public.labo DROP CONSTRAINT labo_year_non_bc;
  END IF;
END $$;

ALTER TABLE public.labo
ADD CONSTRAINT labo_year_non_bc
CHECK (year IS NULL OR year >= 1);

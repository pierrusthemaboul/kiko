-- Migration: Update antichambre for validation tracking
-- Purpose: Add columns to track the Bouncer's (Videur) verdict so events stay in Antichambre if rejected, with visual feedback.

ALTER TABLE public.antichambre
ADD COLUMN IF NOT EXISTS statut_validation text DEFAULT 'EN_ATTENTE_VIDEUR',
ADD COLUMN IF NOT EXISTS motif_refus text;

-- Mettre à jour les anciennes lignes s'il y en a
UPDATE public.antichambre 
SET statut_validation = 'EN_ATTENTE_VIDEUR' 
WHERE statut_validation IS NULL;

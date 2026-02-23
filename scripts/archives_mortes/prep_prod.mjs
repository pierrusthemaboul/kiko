import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function applyProdMigration() {
    console.log("🚀 Application des politiques de sécurité en PRODUCTION...");

    const prod = createClient(
        'https://ppxmtnuewcixbbmhnzzc.supabase.co',
        'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY'
    );

    const sql = `
    -- S'assurer que la table est là avec les bonnes colonnes
    CREATE TABLE IF NOT EXISTS public.user_event_usage (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        event_id uuid REFERENCES public.evenements(id) ON DELETE CASCADE NOT NULL,
        last_seen_at timestamptz DEFAULT now() NOT NULL,
        times_seen int DEFAULT 1 NOT NULL,
        UNIQUE(user_id, event_id)
    );

    -- Activer RLS
    ALTER TABLE public.user_event_usage ENABLE ROW LEVEL SECURITY;

    -- Supprimer les anciennes si elles existent pour repartir propre
    DROP POLICY IF EXISTS "Users can see their own event usage" ON public.user_event_usage;
    DROP POLICY IF EXISTS "Users can record their own event usage" ON public.user_event_usage;
    DROP POLICY IF EXISTS "Users can update their own event usage" ON public.user_event_usage;

    -- Créer les politiques
    CREATE POLICY "Users can see their own event usage" ON public.user_event_usage FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can record their own event usage" ON public.user_event_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own event usage" ON public.user_event_usage FOR UPDATE USING (auth.uid() = user_id);

    -- Index pour la lecture rapide
    CREATE INDEX IF NOT EXISTS idx_user_usage_lookup_prod ON public.user_event_usage (user_id, last_seen_at DESC);
    `;

    try {
        // Supabase JS client ne permet pas de faire du SQL arbitraire facilement sans RPC
        // Mais on peut utiliser l'API REST 'rpc' si on a une fonction existante.
        // Sinon, on va essayer de faire des appels REST individuels pour vérifier la structure.

        console.log("Vérification manuelle via RPC n'étant pas possible sans SQL Editor...");
        console.log("Je vais tenter une insertion avec l'ID de Pierre si je le trouve.");

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

applyProdMigration();

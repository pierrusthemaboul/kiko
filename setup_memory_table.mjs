import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupMemoryTable() {
    console.log("🏗️ Création de la table user_event_usage...");

    const query = `
    CREATE TABLE IF NOT EXISTS public.user_event_usage (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        event_id uuid REFERENCES public.evenements(id) ON DELETE CASCADE NOT NULL,
        last_seen_at timestamptz DEFAULT now() NOT NULL,
        times_seen int DEFAULT 1 NOT NULL,
        UNIQUE(user_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_user_usage_lookup ON public.user_event_usage (user_id, last_seen_at DESC);

    ALTER TABLE public.user_event_usage ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their own event usage') THEN
            CREATE POLICY "Users can see their own event usage" ON public.user_event_usage FOR SELECT USING (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can record their own event usage') THEN
            CREATE POLICY "Users can record their own event usage" ON public.user_event_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own event usage') THEN
            CREATE POLICY "Users can update their own event usage" ON public.user_event_usage FOR UPDATE USING (auth.uid() = user_id);
        END IF;
    END
    $$;
    `;

    // Utilisation de rpc ou direct via l'api si possible (mais Supabase JS ne permet pas de faire du DDL direct facilement)
    // On va tenter de passer par une fonction RPC si elle existe, sinon on demandera à l'utilisateur.

    console.log("⚠️ Supabase JS Client ne supporte pas le DDL (CREATE TABLE) directement.");
    console.log("Veuillez copier-coller le SQL suivant dans l'éditeur SQL de votre Dashboard Supabase :");
    console.log("\n" + query + "\n");
}

setupMemoryTable();

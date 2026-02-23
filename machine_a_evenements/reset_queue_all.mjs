import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Réinitialiser tous les événements à 'pending' sauf Austerlitz
console.log('⏳ Réinitialisation de la file d\'attente...');

const { data, error } = await supabase
    .from('queue_sevent')
    .update({ status: 'pending', processed_at: null, error_log: null, validation_notes: null })
    .neq('titre', "Bataille d'Austerlitz");

if (error) {
    console.log('❌ Erreur lors de la réinitialisation:', error.message);
} else {
    console.log('✅ Tous les événements (sauf Austerlitz) ont été remis en attente.');
}

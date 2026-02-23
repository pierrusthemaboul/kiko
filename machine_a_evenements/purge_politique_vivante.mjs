import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_PROD_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purgePolitics() {
    const titlesToPurge = [
        "Eltsine nomme Poutine Premier ministre",
        "Discours de Dakar : Sarkozy prononce un discours controversé sur l’Afrique à Dakar",
        "Édith Cresson, première femme Premier ministre",
        "Création du super-ministère de l'Écologie avec Jean-Louis Borloo",
        "Fondation de l'association anti-discrimination SOS Racisme"
    ];

    console.log('🚀 PURGE DES ÉVÉNEMENTS POLITIQUES SENSIBLES (PERSONNES VIVANTES)...\n');

    for (const title of titlesToPurge) {
        console.log(`Traitement de : "${title}"...`);
        const { data, error: findError } = await supabase
            .from('evenements')
            .select('id, titre')
            .eq('titre', title);

        if (findError) {
            console.error(`❌ Erreur recherche "${title}":`, findError.message);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`ℹ️ Déjà supprimé ou non trouvé.`);
            continue;
        }

        for (const item of data) {
            const { error: deleteError } = await supabase
                .from('evenements')
                .delete()
                .eq('id', item.id);

            if (deleteError) {
                console.error(`❌ Erreur suppression ID ${item.id}:`, deleteError.message);
            } else {
                console.log(`✅ ID ${item.id} supprimé : ${item.titre}`);
            }
        }
    }

    console.log('\n✨ Purge politique terminée.');
}

purgePolitics();

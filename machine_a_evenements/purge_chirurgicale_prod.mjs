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

async function purge() {
    const titlesToPurge = [
        "La création du parti politique La République en marche sous la direction d'Emmanuel Macron",
        "Macron lance un débat national pour répondre à la crise sociale des Gilets jaunes",
        "Réélection d'Emmanuel Macron à la présidence face à Marine Le Pen",
        "Un proche d'Macron impliqué dans des violences lors d'une manifestation",
        "Assassinat violent d'un enseignant à la suite d'une présentation de caricatures de Mahomet"
    ];

    console.log('🚀 DÉBUT DE LA PURGE CHIRURGICALE EN PRODUCTION...\n');

    for (const title of titlesToPurge) {
        console.log(`Recherche de : "${title}"...`);
        const { data, error: findError } = await supabase
            .from('evenements')
            .select('id, titre')
            .eq('titre', title);

        if (findError) {
            console.error(`❌ Erreur lors de la recherche de "${title}":`, findError.message);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`ℹ️ Non trouvé ou déjà supprimé.`);
            continue;
        }

        for (const item of data) {
            console.log(`⚠️ Suppression de l'ID: ${item.id} (${item.titre})`);
            const { error: deleteError } = await supabase
                .from('evenements')
                .delete()
                .eq('id', item.id);

            if (deleteError) {
                console.error(`❌ Erreur suppression ID ${item.id}:`, deleteError.message);
            } else {
                console.log(`✅ ID ${item.id} supprimé avec succès.`);
            }
        }
    }

    // Recherche bonus au cas où certains noms auraient des variantes (espaces, typos)
    console.log('\n🔍 Recherche de variantes résiduelles (Macron, Samuel Paty)...');

    // On cherche par ILIKE pour être sûr de ne rien rater d'évident
    const { data: leftovers } = await supabase
        .from('evenements')
        .select('id, titre')
        .or('titre.ilike.%Macron%,titre.ilike.%Samuel Paty%');

    if (leftovers && leftovers.length > 0) {
        console.log(`⚠️ ${leftovers.length} éléments résiduels trouvés :`);
        for (const item of leftovers) {
            console.log(`🗑️ Suppression résiduelle : ${item.titre}`);
            await supabase.from('evenements').delete().eq('id', item.id);
        }
    } else {
        console.log('✅ Aucun résiduel critique trouvé.');
    }

    console.log('\n✨ Purge terminée.');
}

purge();

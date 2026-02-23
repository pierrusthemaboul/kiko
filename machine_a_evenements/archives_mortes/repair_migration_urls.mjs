
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function repairUrls() {
    console.log("🛠️ Démarrage de la réparation des URLs d'images...");

    // 1. Récupérer tous les items mal migrés
    // On cherche soit le placeholder spécifique, soit des urls vides/nulles sur les migrations récentes
    const { data: buggedItems, error: fetchError } = await supabase
        .from('evenements')
        .select('id, titre, source_goju2_id, illustration_url')
        .or('illustration_url.eq.URL_DE_L_IMAGE_CHOISIE,illustration_url.eq.EMPTY,illustration_url.eq....,illustration_url.is.null,illustration_url.eq.')
        .not('source_goju2_id', 'is', null);

    if (fetchError) {
        console.error("❌ Erreur lors de la récupération des items buggés:", fetchError.message);
        return;
    }

    if (!buggedItems || buggedItems.length === 0) {
        console.log("✅ Aucun item corrompu trouvé.");
        return;
    }

    console.log(`📦 ${buggedItems.length} items corrompus détectés. Début de la restauration...`);

    let repairedCount = 0;
    for (const item of buggedItems) {
        // 2. Chercher l'URL originale dans goju2
        const { data: original, error: originalError } = await supabase
            .from('goju2')
            .select('illustration_url')
            .eq('id', item.source_goju2_id)
            .single();

        if (originalError || !original || !original.illustration_url) {
            console.error(`  ⚠️ Impossible de trouver l'URL pour : ${item.titre} (ID Source: ${item.source_goju2_id})`);
            continue;
        }

        // 3. Mettre à jour l'événement en production
        const { error: updateError } = await supabase
            .from('evenements')
            .update({ illustration_url: original.illustration_url })
            .eq('id', item.id);

        if (updateError) {
            console.error(`  ❌ Échec de la mise à jour pour : ${item.titre}`, updateError.message);
        } else {
            repairedCount++;
            console.log(`  ✅ Restauration réussie : ${item.titre}`);
        }
    }

    console.log(`\n✨ RÉPARATION TERMINÉE !`);
    console.log(`📊 Total restauré : ${repairedCount} / ${buggedItems.length}`);
}

repairUrls();

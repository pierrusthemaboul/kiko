import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_PROD_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purify() {
    console.log("🧼 [PURIFICATEUR V2] Mission de purification visuelle (Restauration du Ton Kiko)...");

    // 1. Nettoyer la file d'attente des résidus de la V1 (titres vagues)
    console.log("🧹 Nettoyage de la file d'attente (queue_sevent)...");
    const { error: clearError } = await supabase
        .from('queue_sevent')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearError) console.error("⚠️ Erreur lors du vidage de la file d'attente.");

    // 2. Identifier les événements de mort/assassinat dans la production
    const keywords = ['mort de', 'décès de', 'assassinat de', 'suicide de', 'disparition de', 'exécution de', 'mort d\'', 'décès d\'', 'assassinat d\''];
    let allTargets = [];

    for (const kw of keywords) {
        const { data } = await supabase
            .from('evenements')
            .select('*')
            .ilike('titre', `%${kw}%`);
        if (data) allTargets = allTargets.concat(data);
    }

    const targets = Array.from(new Map(allTargets.map(item => [item.id, item])).values());
    console.log(`🎯 ${targets.length} événements historiques identifiés pour purification visuelle.`);

    for (const event of targets) {
        console.log(`\n📸 Purge de l'image pour : "${event.titre}"...`);

        // MISE À JOUR : On garde le titre d'origine, on vide l'image
        const { error: updateError } = await supabase
            .from('evenements')
            .update({
                illustration_url: null, // On supprime l'image morbide
                donnee_corrigee: false // On ne marque plus comme "corrigé" de manière bâclée
            })
            .eq('id', event.id);

        if (updateError) {
            console.error(`   ❌ Erreur update : ${updateError.message}`);
            continue;
        }

        // INJECTION DANS LA QUEUE : Avec une instruction de prompt ultra-secure
        // Le but est de montrer la personne DE SON VIVANT ou un SYMBOLE.
        const safePromptSuffix = `
### MANDATORY VISUAL DIRECTION:
The event is "${event.titre}". 
STRICTLY FORBIDDEN: Do not depict dead bodies, corpses, deathbeds, hospital scenes, coffins, or funerals.
INSTEAD: Depict the subject at the height of their career, full of life, dignity, and prestige. 
If it is an artist, show them in their studio. If it is a leader, show them giving a speech or in a majestic setting. 
Focus on historical grandeur and symbolic legacy. No gore, no blood, no sadness.
`;

        const { error: queueError } = await supabase
            .from('queue_sevent')
            .insert([{
                titre: event.titre,
                year: parseInt(event.date.split('-')[0]),
                description: (event.description_detaillee || event.titre) + "\n\n" + safePromptSuffix,
                type: event.types_evenement?.[0] || 'Culture',
                region: event.region || 'Monde',
                status: 'pending',
                notoriete: event.notoriete || 50
            }]);

        if (queueError) {
            console.error(`   ❌ Erreur queue : ${queueError.message}`);
        } else {
            console.log(`   🚀 Envoyé en file d'attente avec consigne "Life & Honor".`);
        }
    }

    console.log("\n✨ Mission terminée. Les titres sont préservés, les images morbides sont supprimées, et la file d'attente est prête pour des visuels dignes.");
}

purify();

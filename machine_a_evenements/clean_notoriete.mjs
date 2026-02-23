import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

const KEYWORDS_TO_DOWNGRADE = [
    'Traité de', 'Mariage de', 'Mort de', 'Naissance de', 'Sacre de',
    'Fondation de l\'université', 'Création de l\'université', 'Diète de',
    'Union de', 'Institution de', 'Rattachement de', 'États généraux de',
    'Inhumation de', 'Exécution de', 'Abjuration d\'', 'Sacre d\'',
    'Procès de', 'Convocation des', 'Réconciliation de', 'Fondation de l\'Université'
];

const EXCEPTIONS = [
    'Naissance de Jésus', 'Crucifixion de Jésus', 'Mort de Jeanne d\'Arc',
    'Sacre de Napoléon', 'Bataille de Waterloo', 'Bataille de Verdun',
    'Indépendance des États-Unis', 'Prise de la Bastille', 'Débarquement en Normandie',
    'Mort de Louis XVI', 'Exécution de Louis XVI'
];

async function cleanNotoriete() {
    console.log("🧹 Début du nettoyage de la notoriété (Local)...");

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, notoriete')
        .gte('notoriete', 70);

    if (error) {
        console.error("❌ Erreur lors de la récupération:", error);
        return;
    }

    console.log(`📊 ${events.length} candidats à l'analyse.`);

    let count = 0;
    for (const event of events) {
        const title = event.titre;

        // Vérifier les exceptions
        if (EXCEPTIONS.some(ex => title.includes(ex))) {
            continue;
        }

        // Vérifier les mots-clés
        const shouldDowngrade = KEYWORDS_TO_DOWNGRADE.some(kw => title.toLowerCase().includes(kw.toLowerCase()));

        if (shouldDowngrade && event.notoriete > 60) {
            const newNotoriete = 50;
            const { error: updateError } = await supabase
                .from('evenements')
                .update({ notoriete: newNotoriete })
                .eq('id', event.id);

            if (!updateError) {
                console.log(`✅ [${event.notoriete} -> ${newNotoriete}] ${title}`);
                count++;
            }
        }

        // Cas particulier : Batailles (sauf exceptions)
        if (title.toLowerCase().includes('bataille de') && event.notoriete > 80 && !EXCEPTIONS.some(ex => title.includes(ex))) {
            const newNotoriete = 65;
            await supabase.from('evenements').update({ notoriete: newNotoriete }).eq('id', event.id);
            console.log(`⚔️ [${event.notoriete} -> ${newNotoriete}] ${title}`);
            count++;
        }
    }

    console.log(`\n✨ Nettoyage terminé ! ${count} événements mis à jour.`);
    console.log("⚠️ N'oublie pas de synchroniser vers la Prod si le résultat te convient.");
}

cleanNotoriete();

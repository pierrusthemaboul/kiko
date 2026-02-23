
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function edit() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node edit.mjs <uuid> [--titre "New Title"] [--desc "New Desc"] [--noto 80] [--redo-image]');
        return;
    }

    const id = args[0];
    const updates = {};
    let redoImage = false;

    // Parsing sommaire des arguments
    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--titre') updates.titre = args[++i];
        else if (args[i] === '--desc') updates.description_detaillee = args[++i];
        else if (args[i] === '--noto') updates.notoriete_fr = parseInt(args[++i]);
        else if (args[i] === '--redo-image') redoImage = true;
    }

    console.log(`🛠️ Modification de l'événement ${id}...`);

    // 1. Récupérer l'état actuel
    const { data: event, error: fetchError } = await supabase
        .from('evenements')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !event) {
        console.error('❌ Événement introuvable:', fetchError?.message || 'Inconnu');
        return;
    }

    // 2. Appliquer les modifications textuelles
    if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
            .from('evenements')
            .update(updates)
            .eq('id', id);

        if (updateError) {
            console.error('❌ Erreur lors de la mise à jour textuelle:', updateError.message);
        } else {
            console.log('✅ Champs mis à jour avec succès.');
        }
    }

    // 3. Gérer la ré-illustration
    if (redoImage) {
        console.log('📸 Envoi vers la Chambre Noire...');

        const year = event.date ? new Date(event.date).getFullYear() : (event.epoque === 'XXe' ? 1950 : 0);

        const { error: queueError } = await supabase
            .from('queue_sevent')
            .insert([{
                titre: updates.titre || event.titre,
                year: year,
                description: updates.description_detaillee || event.description_detaillee, // On injecte la desc FR, Trinity s'en occupera ou on l'améliorera
                specific_location: updates.description_detaillee || event.description_detaillee, // Garde la desc FR pour REXP
                region: event.region,
                type: Array.isArray(event.types_evenement) ? event.types_evenement[0] : event.types_evenement,
                notoriete: updates.notoriete_fr || event.notoriete_fr || event.notoriete,
                status: 'pending'
            }]);

        if (queueError) {
            console.error('❌ Erreur lors de l\'ajout à la file d\'attente:', queueError.message);
        } else {
            console.log('✅ Événement ajouté à queue_sevent. Lancez "chambre" pour générer l\'image.');
        }
    }
}

edit();

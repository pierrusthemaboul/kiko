import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function moveProblematicToQueue() {
    const titles = [
        "Invasion de l'Ukraine par la Russie",
        "Référendum sur le Brexit",
        "Signature du Civil Rights Act aux États-Unis",
        "Indépendance du Congo belge",
        "Invasion du Koweït par l'Irak",
        "Guerre civile en Bosnie-Herzégovine",
        "Fin de la guerre du Biafra",
        "Protestation de Spire",
        "Déclaration de la Majorité de Louis XV",
        "Édit de Compiègne : renforcement de la législation contre l'hérésie",
        "Attentat de Louis Alibaud contre Louis-Philippe",
        "Règne de Gian Gastone de Médicis",
        "Ulrich von Liechtenstein : L'Épopée d'un Chevalier Ménestrel"
    ];

    console.log(`🔍 Recherche de ${titles.length} événements...`);

    const { data: events, error: fetchError } = await supabase
        .from('evenements')
        .select('*')
        .in('titre', titles);

    if (fetchError) {
        console.error("Erreur lors de la récupération :", fetchError.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("Aucun événement trouvé dans la table 'evenements'.");
        return;
    }

    console.log(`📦 ${events.length} événements trouvés. Préparation du transfert...`);

    const queueData = events.map(e => ({
        titre: e.titre,
        year: e.date_formatee ? parseInt(e.date_formatee.split('-')[0]) : null,
        description: e.description_detaillee || e.description_courte,
        notoriete: e.notoriete,
        type: e.categorie,
        status: 'pending'
    }));

    // 1. Insérer dans la queue
    const { error: insertError } = await supabase
        .from('queue_sevent')
        .insert(queueData);

    if (insertError) {
        console.error("Erreur lors de l'insertion dans la queue :", insertError.message);
        return;
    }

    // 2. Supprimer de la table principale
    const { error: deleteError } = await supabase
        .from('evenements')
        .delete()
        .in('id', events.map(e => e.id));

    if (deleteError) {
        console.error("Erreur lors de la suppression :", deleteError.message);
        return;
    }

    console.log(`✅ Succès : ${events.length} événements renvoyés en file d'attente pour régénération.`);
}

moveProblematicToQueue();

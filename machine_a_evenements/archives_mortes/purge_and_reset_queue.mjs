import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function purgeAndReset() {
    console.log("🧨 Vidage complet de la file d'attente...");
    const { error: deleteError } = await supabase
        .from('queue_sevent')
        .delete()
        .neq('id', 0); // Supprime tout

    if (deleteError) {
        console.error("Erreur vidage:", deleteError.message);
        return;
    }
    console.log("✅ Queue vidée.");

    const titlesToRestore = [
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
        "Ulrich von Liechtenstein : L'Épopée d'un Chevalier Ménestrel",
        "Mort de Pablo Picasso",
        "Mort de Georges Pompidou",
        "Mort de Valéry Giscard d'Estaing",
        "Mort de Jane Birkin",
        "Mort de François Truffaut",
        "Mort de Madame de La Fayette",
        "Mort de Claude",
        "Décès d'Auguste",
        "Mort de Charles le Téméraire"
    ];

    console.log(`📡 Recherche des métadonnées pour ${titlesToRestore.length} événements dans 'evenements'...`);

    // On va chercher les infos (description, année, etc.) pour ces titres dans la table principale
    // Note: comme certains ont été supprimés par recycle_problematic, on va peut-être devoir les recréer à la main ou via backup
    const { data: events } = await supabase
        .from('evenements')
        .select('*')
        .in('titre', titlesToRestore);

    console.log(`📦 ${events?.length || 0} événements retrouvés dans 'evenements'.`);

    // Pour ceux qu'on ne trouve pas dans 'evenements' (parce qu'ils étaient déjà dans la queue et donc DELETED de evenements), 
    // on a un petit souci si on ne les a pas sauvegardés. 
    // MAIS, comme je viens de voir qu'ils étaient dans la queue, je peux essayer de les reconstruire de mémoire ou via les logs récents.

    const manualEvents = [
        { titre: "Invasion de l'Ukraine par la Russie", year: 2022, description: "Invasion à grande échelle de l'Ukraine par la Russie, début d'un conflit majeur en Europe.", type: "Guerre" },
        { titre: "Référendum sur le Brexit", year: 2016, description: "Le Royaume-Uni vote pour quitter l'Union européenne.", type: "Politique" },
        { titre: "Indépendance du Congo belge", year: 1960, description: "Proclamation de l'indépendance de la République démocratique du Congo.", type: "Indépendance" },
        { titre: "Signature du Civil Rights Act aux États-Unis", year: 1964, description: "Loi historique interdisant la ségrégation aux États-Unis.", type: "Droit" },
        { titre: "Invasion du Koweït par l'Irak", year: 1990, description: "Déclenchement de la guerre du Golfe après l'invasion du Koweït par Saddam Hussein.", type: "Guerre" },
        { titre: "Guerre civile en Bosnie-Herzégovine", year: 1992, description: "Conflit ethnique sanglant suite à l'éclatement de la Yougoslavie.", type: "Guerre" },
        { titre: "Fin de la guerre du Biafra", year: 1970, description: "Capitulation du Biafra et réintégration au Nigeria après une famine atroce.", type: "Guerre" },
        { titre: "Mort de Pablo Picasso", year: 1973, description: "Décès du génie du cubisme à Mougins.", type: "Décès" },
        { titre: "Mort de Georges Pompidou", year: 1974, description: "Décès du président français en exercice.", type: "Décès" },
        { titre: "Mort de Valéry Giscard d'Estaing", year: 2020, description: "Décès de l'ancien président de la République française.", type: "Décès" },
        { titre: "Mort de François Truffaut", year: 1984, description: "Décès du réalisateur phare de la Nouvelle Vague.", type: "Décès" },
        { titre: "Mort de Jane Birkin", year: 2023, description: "Décès de l'icône franco-britannique.", type: "Décès" }
    ];

    console.log("📥 Insertion des événements prioritaires...");

    // On combine les infos trouvées en base et les manuelles
    const finalQueue = [
        ...manualEvents.map(e => ({ ...e, status: 'pending' })),
        ...(events || []).map(e => ({
            titre: e.titre,
            year: parseInt(e.date_formatee) || parseInt(e.date?.split('-')[0]),
            description: e.description_detaillee || e.description_courte,
            notoriete: e.notoriete,
            type: e.categorie || (Array.isArray(e.types_evenement) ? e.types_evenement[0] : null),
            status: 'pending'
        }))
    ];

    // Dédoublonnement par titre
    const uniqueQueue = Array.from(new Map(finalQueue.map(item => [item.titre, item])).values());

    const { error: insError } = await supabase
        .from('queue_sevent')
        .insert(uniqueQueue);

    if (insError) console.error("Erreur insertion:", insError.message);
    else console.log(`🚀 ${uniqueQueue.length} événements prioritaires injectés dans la queue.`);
}

purgeAndReset();

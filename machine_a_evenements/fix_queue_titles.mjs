import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function cleanQueueTitles() {
    console.log("🧹 Nettoyage des titres dans la queue...");

    const { data: items, error } = await supabase
        .from('queue_sevent')
        .select('id, titre')
        .or('titre.ilike.L\'Héritage de%,titre.ilike.L\'Ère %');

    if (error) {
        console.error(error.message);
        return;
    }

    console.log(`🔎 Found ${items.length} items to fix.`);

    for (const item of items) {
        let newTitle = item.titre;

        // Patterns de nettoyage
        newTitle = newTitle.replace(/^L'Héritage de /i, 'Mort de ');
        newTitle = newTitle.replace(/^L'Héritage du /i, 'Développement du ');
        newTitle = newTitle.replace(/^L'Héritage d'/i, 'Mort d\'');
        newTitle = newTitle.replace(/^L'héritage de /i, 'Mort de ');
        newTitle = newTitle.replace(/: Unificateur des Francs$/i, '');
        newTitle = newTitle.replace(/: L'Indignation Créatrice$/i, '');
        newTitle = newTitle.replace(/: Artisan du Dialogue Social$/i, '');
        newTitle = newTitle.replace(/: Vision et Modernisation$/i, '');
        newTitle = newTitle.replace(/^L'Ère /i, 'Période ');

        // Cas spécifiques si on les connaît
        if (newTitle.includes("Picasso")) newTitle = "Mort de Pablo Picasso";
        if (newTitle.includes("Pompidou")) newTitle = "Mort de Georges Pompidou";
        if (newTitle.includes("Giscard")) newTitle = "Mort de Valéry Giscard d'Estaing";
        if (newTitle.includes("Jane Birkin")) newTitle = "Mort de Jane Birkin";
        if (newTitle.includes("Truffaut")) newTitle = "Mort de François Truffaut";
        if (newTitle.includes("Madame de La Fayette")) newTitle = "Mort de Madame de La Fayette";

        if (newTitle !== item.titre) {
            console.log(`✏️  "${item.titre}" -> "${newTitle}"`);
            await supabase
                .from('queue_sevent')
                .update({ titre: newTitle })
                .eq('id', item.id);
        }
    }

    console.log("✅ Nettoyage terminé.");
}

cleanQueueTitles();

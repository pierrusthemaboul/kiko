import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullAudit() {
    const ids = [
        // Je vais chercher par titres car je n'ai pas tous les IDs
    ];

    const titles = [
        "La création du parti politique La République en marche sous la direction d'Emmanuel Macron",
        "Macron lance un débat national pour répondre à la crise sociale des Gilets jaunes",
        "Réélection d'Emmanuel Macron à la présidence face à Marine Le Pen",
        "Un proche d'Macron impliqué dans des violences lors d'une manifestation",
        "Assassinat violent d'un enseignant à la suite d'une présentation de caricatures de Mahomet",
        "Mort de Pablo Picasso",
        "Commission indépendante estime 216 000 victimes d'abus sexuels dans l'Église depuis 1950"
    ];

    console.log('--- AUDIT DÉTAILLÉ DES ÉVÉNEMENTS CIBLÉS ---\n');

    for (const title of titles) {
        const { data, error } = await supabase.from('evenements').select('*').eq('titre', title).single();
        if (data) {
            console.log(`TITRE: ${data.titre}`);
            console.log(`ID: ${data.id}`);
            console.log(`DATE: ${data.date_ev}`);
            console.log(`DESCRIPTION: ${data.description}`);
            console.log(`URL IMAGE: ${data.url_image || 'N/A'}`);
            console.log('--------------------------------------------\n');
        }
    }
}

fullAudit();

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function purgerErreursHistoriques() {
    const inputPath = path.join(__dirname, 'vraies_erreurs_annees.json');

    if (!fs.existsSync(inputPath)) {
        console.error("❌ Fichier vraies_erreurs_annees.json introuvable.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const idsToDelete = data.map(item => item.id);

    if (idsToDelete.length === 0) {
        console.log("Aucun événement à supprimer.");
        return;
    }

    console.log(`🗑️  Tentative de suppression de ${idsToDelete.length} événements litigieux de la base de production...`);

    const { error } = await supabase
        .from('evenements')
        .delete()
        .in('id', idsToDelete);

    if (error) {
        console.error("❌ Erreur lors de la suppression:", error);
    } else {
        console.log(`✅ Succès ! Les ${idsToDelete.length} événements avec des erreurs critiques ont été éliminés de la base de données.`);
        console.log("La base est désormais nettoyée de ses pires anachronismes !");
    }
}

purgerErreursHistoriques();

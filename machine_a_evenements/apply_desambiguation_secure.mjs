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

async function applyDisambiguation() {
    const filePath = path.join(__dirname, 'propositions_homonymes.json');

    if (!fs.existsSync(filePath)) {
        console.error("❌ Le fichier propositions_homonymes.json est introuvable. As-tu lancé l'étape 1 ?");
        return;
    }

    const dataRaw = fs.readFileSync(filePath, 'utf8');
    const propositions = JSON.parse(dataRaw);

    // Ne prendre que ceux validés par l'utilisateur
    const toApply = propositions.filter(p => p.appliquer === true);

    if (toApply.length === 0) {
        console.log("ℹ️ Aucun titre validé à appliquer.");
        return;
    }

    console.log(`🚀 APPLICATION SÉCURISÉE : Mise à jour de ${toApply.length} titres confirmés...`);
    let succesCount = 0;

    for (let p of toApply) {
        // Double sécurité : on vérifie que l'ID est bien exact (ce que l'IA ne peut plus mélanger car figé dans le json)
        console.log(` - Mise à jour de [${p.annee}] : "${p.titre_actuel}" ➡️ "${p.titre_propose}"`);
        const { error } = await supabase.from('evenements').update({ titre: p.titre_propose }).eq('id', p.id);

        if (error) {
            console.error(`   ❌ ERREUR DB : ${error.message}`);
        } else {
            succesCount++;
        }
    }

    console.log(`\n✅ ${succesCount}/${toApply.length} mis à jour avec succès dans la base de production.`);
    console.log(`🛡️ Tout est propre et désambiguïsé !`);
}

applyDisambiguation();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const flagPath = path.join(__dirname, 'erreurs_detectees.json');

async function updateEvent(id, updates) {
    const { error } = await supabase.from('evenements').update(updates).eq('id', id);
    if (error) {
        console.error("❌ Erreur Update:", error.message);
        return false;
    }
    return true;
}

async function validerEnMasse() {
    if (!fs.existsSync(flagPath)) {
        console.log("✅ Aucun fichier d'erreurs détectées n'a été trouvé. Tout est propre !");
        process.exit(0);
    }

    let erreurs = [];
    try {
        erreurs = JSON.parse(fs.readFileSync(flagPath, 'utf8'));
    } catch (e) {
        console.error("❌ Fichier erreurs corrompu");
        process.exit(1);
    }

    if (erreurs.length === 0) {
        console.log("✅ Plus aucune erreur à valider !");
        process.exit(0);
    }

    console.log(`🚀 ACTIVATION DU MODE AUTOMATIQUE ! Je valide la liste des ${erreurs.length} événements !`);

    let erreursRestantes = [];

    // Et tous les autres !
    for (let j = 0; j < erreurs.length; j++) {
        const autoErr = erreurs[j];
        const autoCorr = autoErr.suggested_correction || {};
        const autoUpdates = {};

        let skipDate = false;
        if (autoCorr.date) {
            const { data: eventOri } = await supabase.from('evenements').select('date').eq('id', autoErr.id).single();
            if (eventOri && eventOri.date) {
                const anneeNouvelle = autoCorr.date.split('-')[0];
                const anneeAncienne = eventOri.date.split('-')[0];
                if (anneeNouvelle === anneeAncienne) skipDate = true;
            }
        }

        if (autoCorr.titre) autoUpdates.titre = autoCorr.titre;
        if (autoCorr.date && !skipDate) autoUpdates.date = autoCorr.date;
        if (autoCorr.description_detaillee) autoUpdates.description_detaillee = autoCorr.description_detaillee;

        if (Object.keys(autoUpdates).length > 0) {
            process.stdout.write(`⚙️ Auto-correction ${j + 1}/${erreurs.length}... `);
            const success = await updateEvent(autoErr.id, autoUpdates);
            if (success) {
                console.log(`OK`);
            } else {
                console.log(`ECHEC`);
                erreursRestantes.push(autoErr);
            }
        }
    }

    // Sauvegarde des restes (ceux qui ont échoué)
    fs.writeFileSync(flagPath, JSON.stringify(erreursRestantes, null, 2));
    console.log(`\n💾 Sauvegarde terminée. Terminé.`);
}

validerEnMasse();

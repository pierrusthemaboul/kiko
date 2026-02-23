import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const flagPath = path.join(__dirname, 'erreurs_detectees.json');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function updateEvent(id, updates) {
    const { error } = await supabase
        .from('evenements')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error("❌ Erreur Update:", error.message);
        return false;
    }
    return true;
}

async function validerErreurs() {
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

    console.log(`\n============================================================`);
    console.log(`⚡ VALIDATION RAPIDE KIKO - ${erreurs.length} Erreurs ⚡`);
    console.log(`============================================================\n`);

    const erreursRestantes = [];

    for (let i = 0; i < erreurs.length; i++) {
        const err = erreurs[i];

        // On récupère l'original pour l'affichage
        const { data: eventOri } = await supabase
            .from('evenements')
            .select('titre, date, description_detaillee')
            .eq('id', err.id)
            .single();

        if (!eventOri) {
            console.log(`⚠️ Événement ${err.id} introuvable en base. On ignore.`);
            continue;
        }

        const corr = { ...err.suggested_correction };

        // --- FILTRIER LES DATES SI MÊME ANNÉE ---
        if (corr.date && eventOri.date) {
            const anneeNouvelle = corr.date.split('-')[0];
            const anneeAncienne = eventOri.date.split('-')[0];
            if (anneeNouvelle === anneeAncienne) {
                delete corr.date; // On s'en fiche si l'année est la même
            }
        }

        if (!corr.titre && !corr.date && !corr.description_detaillee) {
            // S'il n'y a plus aucune correction après filtrage, on passe à l'erreur suivante silencieusement
            continue;
        }

        console.log(`\n--- ERREUR ${i + 1}/${erreurs.length} ---`);
        console.log(`❌ TYPE          : ${err.error_types.join(', ')}`);
        console.log(`💡 JUSTIFICATION : ${err.justification}`);
        console.log(``);
        console.log(`ANCIEN :`);
        console.log(`  Titre : ${eventOri.titre}`);
        console.log(`  Date  : ${eventOri.date}`);
        console.log(`  Desc  : ${eventOri.description_detaillee}`);
        console.log(``);
        console.log(`NOUVEAU DÉDUIT PAR L'IA :`);

        if (corr.titre) console.log(`  🟢 Titre : ${corr.titre}`);
        if (corr.date) console.log(`  🟢 Date  : ${corr.date}`);
        if (corr.description_detaillee) console.log(`  🟢 Desc  : ${corr.description_detaillee}`);

        console.log(``);
        const action = await askQuestion(`>>> Accepter ces corrections ? (o = oui / n = non / passer = p / d = DEL EVENEMENT / q = quitter) : `);

        if (action.toLowerCase() === 'q') {
            // on sauve ce qu'il reste + l'actuel
            erreursRestantes.push(err);
            for (let j = i + 1; j < erreurs.length; j++) {
                erreursRestantes.push(erreurs[j]);
            }
            break;
        } else if (action.toLowerCase() === 'd') {
            // Suppression de l'événement pur et simple
            console.log(`💥 SUPPRESSION DÉFINITIVE de l'événement ${err.id}...`);
            const { error: delError } = await supabase.from('evenements').delete().eq('id', err.id);
            if (delError) {
                console.error("❌ Erreur Suppression:", delError.message);
                erreursRestantes.push(err);
            } else {
                console.log(`✅ Événement désintégré.`);
            }
        } else if (action.toLowerCase() === 'o' || action.trim() === '') {
            // Mise à jour
            const updates = {};
            if (corr.titre) updates.titre = corr.titre;
            if (corr.date) updates.date = corr.date;
            if (corr.description_detaillee) updates.description_detaillee = corr.description_detaillee;

            console.log(`⏳ Mise à jour de ${err.id}...`);
            const success = await updateEvent(err.id, updates);
            if (success) {
                console.log(`✅ Mis à jour avec succès!`);
            } else {
                erreursRestantes.push(err); // On le garde si ça a foiré
            }
        } else if (action.toLowerCase() === 'a') {
            console.log(`🚀 ACTIVATION DU MODE AUTOMATIQUE ! Je valide TOUT le reste de la liste !`);
            // On valide celui-là
            const updates = {};
            if (corr.titre) updates.titre = corr.titre;
            if (corr.date) updates.date = corr.date;
            if (corr.description_detaillee) updates.description_detaillee = corr.description_detaillee;
            await updateEvent(err.id, updates);

            // Et tous les autres !
            for (let j = i + 1; j < erreurs.length; j++) {
                const autoErr = erreurs[j];
                const autoCorr = autoErr.suggested_correction;
                const autoUpdates = {};

                // Petit filtre des dates pour eux aussi
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
                    await updateEvent(autoErr.id, autoUpdates);
                    console.log(`OK`);
                }
            }
            break; // On a tout fini
        } else {
            console.log(`⏭️ Ignoré (On le retire de la liste).`);
        }

        // Sauvegarde immédiate après chaque action (sauf "q" qui break et qui le fait en sortie)
        if (action.toLowerCase() !== 'q') {
            const nextErreurs = erreurs.slice(i + 1);
            fs.writeFileSync(flagPath, JSON.stringify([...erreursRestantes, ...nextErreurs], null, 2));
        }
    }

    // Sauvegarde des restes
    fs.writeFileSync(flagPath, JSON.stringify(erreursRestantes, null, 2));
    console.log(`\n💾 Sauvegarde terminée. Il reste ${erreursRestantes.length} erreurs en attente.`);
    rl.close();
}

validerErreurs();

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyIntegrity() {
    console.log("============================================================");
    console.log("📡 DÉMARRAGE DE L'AUDIT D'INTÉGRITÉ COMPLET DE LA PRODUCTION");
    console.log("============================================================\n");

    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('*').range(from, from + 999);
        if (error) { console.error("❌ Erreur de récupération:", error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    console.log(`✅ ${allEvents.length} événements récupérés et analysés.\n`);

    const issues = {
        missingMandatory: [],
        invalidDates: [],
        anachronisticImages: [],
        duplicateTitles: [],
        semanticMismatch: [] // Suspicion d'écrasement de ligne
    };

    let seenTitles = new Set();
    let exactDuplicates = [];

    for (const ev of allEvents) {
        // 1. Vérification des champs vitaux de production
        if (!ev.titre || !ev.date || !ev.description_detaillee || !ev.illustration_url || typeof ev.notoriete === 'undefined') {
            issues.missingMandatory.push({ id: ev.id, titre: ev.titre || "[SANS TITRE]" });
        }

        // 2. Vérification des Dates (Format strict)
        const dateStr = String(ev.date || '');
        if (!dateStr.match(/^-?\d{4}-\d{2}-\d{2}$/) && !dateStr.match(/^\d+-\d{2}-\d{2}$/)) {
            issues.invalidDates.push({ id: ev.id, titre: ev.titre, date: ev.date });
        }

        // 3. Doublons de titres stricts (possiblement normal mais à surveiller)
        const normalizedTitle = ev.titre ? ev.titre.toLowerCase().trim() : '';
        if (seenTitles.has(normalizedTitle)) {
            issues.duplicateTitles.push(ev.titre);
            exactDuplicates.push(ev);
        } else {
            seenTitles.add(normalizedTitle);
        }

        // 4. Test Sémantique Anti-Mélange (Inversion d'ID lors de scripts IA)
        // Vérifie si TOUS les mots longs et importants du titre sont ABSENTS de la description complète.
        if (ev.titre && ev.description_detaillee) {
            const forbiddenWords = ['dans', 'pour', 'avec', 'sous', 'vers', 'comme', 'plus', 'entre', 'première', 'deuxième'];
            const titleWords = ev.titre.toLowerCase()
                .split(/[ \-\'\(\)\.,]+/)
                .filter(w => w.length > 4 && !forbiddenWords.includes(w));

            const desc = ev.description_detaillee.toLowerCase();
            let hasAtLeastOneMatch = false;

            // Il suffit qu'un seul mot clé complexe corresponde pour rassurer
            for (let w of titleWords) {
                // On inclut les stems simples
                if (desc.includes(w) || desc.includes(w.substring(0, w.length - 1))) {
                    hasAtLeastOneMatch = true;
                    break;
                }
            }

            if (titleWords.length >= 2 && !hasAtLeastOneMatch) {
                issues.semanticMismatch.push({ id: ev.id, titre: ev.titre, extrait_desc: ev.description_detaillee.substring(0, 50) + "..." });
            }
        }
    }

    // Affichage des Résultats
    console.log(`[1] CHAMPS MANQUANTS (Incomplets pour le jeu) : ${issues.missingMandatory.length}`);
    if (issues.missingMandatory.length > 0) console.log("    Exemples:", issues.missingMandatory.slice(0, 3));

    console.log(`\n[2] FORMATS DE DATE CASSÉS : ${issues.invalidDates.length}`);
    if (issues.invalidDates.length > 0) console.log("    Exemples:", issues.invalidDates.slice(0, 3));

    console.log(`\n[3] HOMONYMES EXACTS (Titres identiques) : ${issues.duplicateTitles.length}`);

    console.log(`\n[4] 🚨 SUSPICION DE MÉLANGE SÉMANTIQUE (Titre / Description) : ${issues.semanticMismatch.length}`);
    if (issues.semanticMismatch.length > 0) {
        console.log("    => Ces éléments ont possiblement subi une altération d'ID. Voici TOUS les cas :");
        for (let m of issues.semanticMismatch) {
            console.log(`       - [${m.titre}] / Desc: ${m.extrait_desc}`);
        }
    } else {
        console.log("    => Aucun croisement flagrant détecté !");
    }

    console.log("\n============================================================");
    let health = "✅ EXCELLENTE";
    if (issues.missingMandatory.length > 0 || issues.invalidDates.length > 0 || issues.semanticMismatch.length > 5) {
        health = "⚠️ CRITIQUE (Fichiers corrompus)";
    }
    console.log(`🏥 ÉTAT GLOBAL DE LA BASE DE DONNÉES : ${health}`);
    console.log("============================================================");
}

verifyIntegrity();

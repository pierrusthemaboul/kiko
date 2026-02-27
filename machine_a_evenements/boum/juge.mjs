import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

function extractJsonFromText(rawText) {
    if (typeof rawText !== 'string') throw new Error('Réponse IA vide ou non textuelle');
    let text = rawText.trim();
    text = text.replace(/```json\s*/gi, '```');
    const fenced = text.match(/```([\s\S]*?)```/);
    if (fenced?.[1]) text = fenced[1].trim();

    try {
        return JSON.parse(text);
    } catch {
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let start = -1;
        if (firstBrace === -1) start = firstBracket;
        else if (firstBracket === -1) start = firstBrace;
        else start = Math.min(firstBrace, firstBracket);

        if (start === -1) throw new Error('JSON introuvable dans la réponse IA');
        const candidate = text.slice(start);

        const objMatch = candidate.match(/\{[\s\S]*\}/);
        const arrMatch = candidate.match(/\[[\s\S]*\]/);
        const picked = arrMatch && objMatch
            ? (arrMatch[0].length >= objMatch[0].length ? arrMatch[0] : objMatch[0])
            : (arrMatch?.[0] || objMatch?.[0]);
        if (!picked) throw new Error('JSON introuvable dans la réponse IA');
        return JSON.parse(picked);
    }
}

function assertEnv(name, value) {
    if (!value || String(value).trim().length === 0) {
        throw new Error(`Configuration manquante: ${name}`);
    }
}

function assertStartupConfig() {
    assertEnv('SUPABASE_URL', process.env.SUPABASE_URL);
    assertEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
}

// Réécriture de la description par Gemini quand le titre a changé
async function rewriteDescriptionWithGemini(titreFinal, descriptionOriginale) {
    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `Tu travailles pour un jeu de culture générale français grand public.
Le titre officiel de l'événement est : "${titreFinal}"
L'ancienne description (qui peut ne plus correspondre exactement) était : "${descriptionOriginale}"

Réécris une description courte (une seule phrase, max 20 mots) qui correspond EXACTEMENT au nouveau titre.
Renvoie UNIQUEMENT la description, sans guillemets ni introduction.`;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3 }
                })
            });
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 5000 * attempt));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || descriptionOriginale;
        } catch (err) {
            if (attempt === 3) return descriptionOriginale; // Fallback sur l'ancienne desc
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function fetchGeminiJsonWithRetry(prompt, maxRetries = 3) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
                })
            });

            if (response.status === 429) {
                await new Promise(r => setTimeout(r, 5000 * attempt));
                continue;
            }
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            return extractJsonFromText(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
        } catch (err) {
            if (attempt === maxRetries) throw err;
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

async function runJuge() {
    console.log("======================================================");
    console.log("  ⚖️  DÉMARRAGE DE L'AGENT JUGE (Arbitrage Gemini 2.0 Flash)");
    console.log("======================================================\n");

    try {
        assertStartupConfig();
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    console.log("📥 Lecture des dossiers ERROR dans labo...");

    // On extrait tous les conflits
    const { data: conflits, error } = await localDb
        .from('labo')
        .select('*')
        .eq('status', 'ERROR');

    if (error) {
        console.error("❌ Erreur accès BD Locale:", error.message);
        return;
    }

    if (!conflits || conflits.length === 0) {
        console.log("✅ Le bureau du Juge est vide. Aucun conflit à traiter !");
        return;
    }

    console.log(`⚖️  ${conflits.length} dossiers posent sur le bureau du Juge. Audience en cours...\n`);

    for (const dossier of conflits) {
        try {
            const prompt = `Voici le dossier :
 - Titre de l'événement : "${dossier.titre}"
 - Année actuellement en base : ${dossier.year}

 MISSION :
 1) Donne la VRAIE année absolue, celle qui fait consensus dans les encyclopédies sérieuses.
 2) Reprécise le titre POUR LE RENDRE INFAILLIBLE : 
 - Utilise l'appellation officielle (ex: "L'Ordre d'Appel du 18 Juin", pas "Le discours de De Gaulle").
 - Ajoute des qualificatifs (ex: "L'entrée en vigueur de..." ou "Le vote de la loi...") s'il y a un doute.
 - BANNIS ABSOLUMENT TOUTE DATE OU SAISON DU TITRE.
 - IMPORTANT : Garde le titre très concis et percutant (idéalement moins de 10 mots) sans perdre en précision historique.

 Renvoie UNIQUEMENT un objet JSON valide avec cette structure exacte (sans aucun blabla) :
 {
   "annee_corrigee": 1984,
   "titre_corrige": "Nouveau titre canonique historique sans date"
 }`;

            const verdict = await fetchGeminiJsonWithRetry(prompt);

            if (!verdict || typeof verdict.annee_corrigee !== 'number') {
                throw new Error("Verdict invalide (annee_corrigee manquante)");
            }

            console.log(`\n👨‍⚖️ DOSSIER : "${dossier.titre}"`);
            console.log(`   > Année en base : ${dossier.year}`);
            console.log(`   > 💡 Verdict Année : ${verdict.annee_corrigee}`);

            const titreFinal = verdict.titre_corrige ? verdict.titre_corrige : dossier.titre;
            let descriptionFinale = dossier.description;

            if (titreFinal !== dossier.titre) {
                console.log(`   > ✏️  Titre modifié : "${titreFinal}"`);
                console.log(`   > ✍️  Gemini réécrit la description...`);
                descriptionFinale = await rewriteDescriptionWithGemini(titreFinal, dossier.description);
                console.log(`   > 📝 Nouvelle description : "${descriptionFinale}"`);
            }

            // Mise à jour de la base de données
            const { error: updateError } = await localDb
                .from('labo')
                .update({
                    year: verdict.annee_corrigee,
                    titre: titreFinal,
                    description: descriptionFinale,
                    status: 'VERIFIED',
                    error_log: null
                })
                .eq('id', dossier.id);

            if (updateError) {
                console.error(`   ❌ Erreur de sauvegarde :`, updateError.message);
            } else {
                console.log(`   ✅ Dossier classé (Mis à jour en base).`);
            }

            // Pause de courtoisie pour l'API
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(`  ⚠️ Erreur technique sur le dossier "${dossier.titre}" :`, err.message);

            await localDb
                .from('labo')
                .update({ error_log: `JUGE_ERROR: ${err.message}` })
                .eq('id', dossier.id);
        }
    }

    console.log(`\n💥 MISSION DU JUGE TERMINÉE ! Tous les conflits ont été arbitrés.`);
}

runJuge();

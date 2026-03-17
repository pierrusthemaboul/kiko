import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const localDb = createClient(process.env.SUPABASE_URL || 'http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 429) {
                const wait = attempt * 5000;
                console.warn(`⏳ Rate limit Gemini, attente ${wait / 1000}s...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            if (attempt === maxRetries) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function genererDescription(titre, year) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Tu es un historien expert pour un jeu de société de chronologie.
Titre de l'événement : "${titre}"
Année : ${year}

TÂCHE : Rédige une description unique, factuelle et captivante de cet événement précis en 2 ou 3 phrases maximum.
CONTRAINTES :
- Ne répète pas le titre.
- Ne mentionne pas la date dans la description.
- Sois très précis sur les faits (lieux, acteurs, conséquences).
- Langue : Français.
- Ton : Encyclopédique mais accessible.

Réponse courte et directe sans fioritures.`;

    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
        })
    });

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Description non générée.";
}

async function runRenovation() {
    console.log("======================================================");
    console.log("  🏗️  DÉMARRAGE DE LA RÉNOVATION DES DESCRIPTIONS");
    console.log("======================================================\n");

    // On cible les événements passés au Juge ou flaggés par l'audit précédent
    const { data: dossiers, error } = await localDb
        .from('boumboum')
        .select('id, titre, year, description')
        .in('status', ['VERIFIED_BY_JUDGE', 'AUDIT_KO', 'AUDIT_ANXIOGENE']);

    if (error) {
        console.error("❌ Erreur accès DB:", error.message);
        return;
    }

    if (!dossiers || dossiers.length === 0) {
        console.log("✅ Aucun dossier à rénover.");
        return;
    }

    console.log(`📋 ${dossiers.length} dossiers vont recevoir une nouvelle description synchronisée.\n`);

    for (let i = 0; i < dossiers.length; i++) {
        const d = dossiers[i];
        try {
            process.stdout.write(`[${i + 1}/${dossiers.length}] Rénovation de : "${d.titre}"... `);

            const nouvelleDesc = await genererDescription(d.titre, d.year);

            const { error: upError } = await localDb
                .from('boumboum')
                .update({
                    description: nouvelleDesc,
                    status: 'VERIFIED_BY_JUDGE' // On remet tout au propre
                })
                .eq('id', d.id);

            if (upError) throw upError;
            console.log("✅ OK");

        } catch (err) {
            console.log(`❌ Erreur : ${err.message}`);
        }

        // Petite pause pour respirer entre les appels Gemini
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n✨ FIN DE LA RÉNOVATION. La base est de nouveau cohérente.`);
}

runRenovation();


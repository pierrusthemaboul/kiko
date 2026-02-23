import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function processDeduplication() {
    console.log("🧹 Filtrage EXPERT des doublons (Zéro hésitation)...");

    if (!fs.existsSync('semantic_duplicates_report.json')) {
        console.error("❌ Rapport de doublons introuvable.");
        return;
    }

    const report = JSON.parse(fs.readFileSync('semantic_duplicates_report.json', 'utf8'));
    console.log(`🧐 Analyse de ${report.length} suspects...`);

    const certainDuplicates = [];
    const batchSize = 25;

    for (let i = 0; i < report.length; i += batchSize) {
        const batch = report.slice(i, i + batchSize);

        const prompt = `Tu es un expert historien rigoureux. Voici une liste de paires d'événements suspectés d'être des DOUBLONS (ID1 vs ID2).
TA MISSION : Identifier uniquement les doublons INDISCUTABLES (le même fait historique exact).

RÈGLES DE REJET (Ne garde PAS si) :
- Ce sont deux livres différents parus la même année (ex: Madame Bovary vs Les Fleurs du Mal).
- Ce sont deux batailles différentes.
- C'est une suite logique (ex: Mort de X vs Début du règne de Y).
- Ce sont deux étapes d'un même projet (ex: Début de construction vs Fin de construction).

RÈGLES D'ACCEPTATION (Garde UNIQUEMENT si) :
- C'est le même titre à une virgule près.
- C'est un sigle vs nom complet (ex: SMIG vs Salaire Minimum).
- C'est une traduction ou formulation alternative du même événement précis.

LISTE DES PAIRES :
${batch.map((p, idx) => `Paire ${i + idx}:
A) ${p.titre1} [${p.date1}] (${p.id1})
B) ${p.titre2} [${p.date2}] (${p.id2})`).join('\n\n')}

Réponds UNIQUEMENT en JSON sous ce format :
{
  "certain_duplicates": [
    { "id_to_delete": "ID_DE_L_EVENEMENT_LE_MOINS_BIEN_TITRE", "id_to_keep": "ID_DE_L_AUTRE", "reason": "Bref" }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());
            if (data.certain_duplicates) certainDuplicates.push(...data.certain_duplicates);
            console.log(`✅ Batch ${i / batchSize + 1} traité... (${certainDuplicates.length} identifiés)`);
        } catch (err) {
            console.error(`❌ Erreur batch :`, err.message);
        }
    }

    console.log(`\n🚀 Application de la suppression pour ${certainDuplicates.length} doublons confirmés...`);

    for (const dup of certainDuplicates) {
        process.stdout.write(`🗑️ Suppression de ${dup.id_to_delete}... `);
        const { error } = await supabase.from('evenements').delete().eq('id', dup.id_to_delete);
        if (error) console.log(`❌ Erreur: ${error.message}`);
        else console.log(`✅ OK`);
    }

    console.log(`\n🏁 Nettoyage terminé. ${certainDuplicates.length} doublons éliminés avec certitude.`);
}

processDeduplication();

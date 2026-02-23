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

async function findDuplicatesBatch() {
    console.log("🕵️ Lancement de l'audit de DOUBLONS par BLOCS TEMPORELS...");

    // 1. Récupérer TOUS les événements
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre, date').range(from, from + 999);
        if (error) break;
        allEvents = allEvents.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }

    console.log(`📊 ${allEvents.length} événements chargés.`);

    // 2. Définir des blocs de 20 ans avec chevauchement
    const startYear = -500;
    const endYear = 2025;
    const blockSize = 20;
    const overlap = 5;

    const duplicates = new Set();
    const duplicatePairs = [];

    for (let year = startYear; year < endYear; year += (blockSize - overlap)) {
        const blockStart = year;
        const blockEnd = year + blockSize;

        const blockEvents = allEvents.filter(e => {
            const y = new Date(e.date).getFullYear();
            return y >= blockStart && y <= blockEnd;
        });

        if (blockEvents.length < 2) continue;

        console.log(`📅 Analyse bloc ${blockStart} à ${blockEnd} (${blockEvents.length} événements)...`);

        // Gemini can handle ~100 events comfortably
        const batchSize = 100;
        for (let i = 0; i < blockEvents.length; i += batchSize) {
            const batch = blockEvents.slice(i, i + batchSize);

            const prompt = `Tu es un expert historien. Voici une liste d'événements historiques (ID: Titre [Année]).
IDENTIFIE TOUS LES DOUBLONS SÉMANTIQUES : deux entrées qui décrivent le même événement factuel, même si le titre ou l'année diffère légèrement.

LISTE D'ÉVÉNEMENTS :
${batch.map(e => `${e.id}: ${e.titre} [${new Date(e.date).getFullYear()}]`).join('\n')}

Réponds UNIQUEMENT en JSON sous ce format :
{
  "duplicates": [
    { "id1": "ID1", "id2": "ID2", "reason": "Pourquoi c'est le même" }
  ]
}`;

            try {
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();
                const data = JSON.parse(responseText);

                if (data.duplicates) {
                    for (const dup of data.duplicates) {
                        const pairKey = [dup.id1, dup.id2].sort().join('_');
                        if (!duplicates.has(pairKey)) {
                            duplicates.add(pairKey);
                            const e1 = allEvents.find(e => e.id === dup.id1);
                            const e2 = allEvents.find(e => e.id === dup.id2);
                            if (e1 && e2) {
                                duplicatePairs.push({
                                    id1: dup.id1,
                                    titre1: e1.titre,
                                    date1: e1.date,
                                    id2: dup.id2,
                                    titre2: e2.titre,
                                    date2: e2.date,
                                    reason: dup.reason
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`❌ Erreur bloc ${blockStart}:`, err.message);
            }
        }
    }

    fs.writeFileSync('semantic_duplicates_report.json', JSON.stringify(duplicatePairs, null, 2));
    console.log(`\n🏁 Terminé. ${duplicatePairs.length} doublons potentiels identifiés.`);
}

findDuplicatesBatch();

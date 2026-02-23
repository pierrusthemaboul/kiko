import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialisation de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Utilisation de gemini-2.0-flash pour une excellente capacité de logique
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function callGemini(prompt) {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        if (e.message.includes('429')) {
            console.warn("⚠️ Rate limit Gemini, pause extra de 10s...");
            await new Promise(r => setTimeout(r, 10000));
            return callGemini(prompt);
        }
        console.error("❌ Erreur Gemini:", e.message);
        return null;
    }
}

async function auditGlobal() {
    console.log("📥 Récupération de tous les événements depuis Supabase (production)...");

    let allEvents = [];
    let from = 0;
    const step = 1000;

    // Récupération par lot pour contourner la limite de 1000 de Supabase
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date, description_detaillee')
            .range(from, from + step - 1);

        if (error) {
            console.error("❌ Erreur Supabase:", error.message);
            return;
        }

        allEvents = allEvents.concat(data);
        if (data.length < step) break;
        from += step;
    }

    console.log(`✅ ${allEvents.length} événements récupérés.`);

    const flagPath = path.join(__dirname, 'erreurs_detectees.json');
    const logsPath = path.join(__dirname, 'audit_processed_ids.json');

    let dbErreurs = [];
    let processedIds = new Set();

    // Système de reprise en cas de plantage
    if (fs.existsSync(flagPath)) {
        try {
            dbErreurs = JSON.parse(fs.readFileSync(flagPath, 'utf8'));
        } catch (e) {
            console.log("Fichier erreurs_detectees.json non lisible, on reprend à zéro.");
        }
    }

    if (fs.existsSync(logsPath)) {
        try {
            const idsList = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
            processedIds = new Set(idsList);
        } catch (e) { }
    }

    const remainingEvents = allEvents.filter(e => !processedIds.has(e.id));
    if (remainingEvents.length === 0) {
        console.log("✅ Tous les événements ont déjà été audités !");
        return;
    }

    console.log(`🔄 Il reste ${remainingEvents.length} événements à auditer (déjà: ${processedIds.size}). `);
    console.log(`🧠 Lancement de l'AUDIT GEMINI 1.5 PRO...`);

    const batchSize = 10;

    for (let i = 0; i < remainingEvents.length; i += batchSize) {
        const batch = remainingEvents.slice(i, i + batchSize);
        console.log(`🧐 Analyse lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(remainingEvents.length / batchSize)}...`);

        const prompt = `Tu es l'Auditeur Historique Suprême d'une base de données d'événements historiques de jeu.
Ta mission est stricte : tu dois repérer 4 types d'erreurs majeures. 

LES 4 TYPES D'ERREURS À TRAQUER :
1. "ERREUR_DATE" : L'année de l'événement est factuellement fausse selon le consensus historique (ex: Crue de la Seine en 1909 au lieu de 1910). Si l'année est bonne au regard de l'histoire, CE N'EST PAS UNE ERREUR (ignorer le jour/mois s'il est au 01-01 par défaut).
2. "TITRE_INCOMPLET" : Il manque un mot clé obligatoire pour que le titre ait tout son sens (ex: "Signature du traité d'interdiction" -> il manque "des essais nucléaires").
3. "TITRE_IMPRECIS" : Le titre est beaucoup trop générique et on ne sait pas où cela se passe si ce n'est pas mondialement célèbre (ex: "Élections législatives : retour de la gauche" -> dans quel pays ? "Explosion" -> de quoi, où ?).
4. "DESCRIPTION_PAUVRE" : La description détaillée ("description_detaillee") est mauvaise qualitativement, trop courte, ou omet une cause principale (ex: ne pas mentionner le météore pour l'événement de Toungouska).

REGLE ABSOLUE : Sois IMPITOYABLE sur ces 4 points, mais ne flagge pas pour des virgules ou du simple style. Si un événement ne subit AUCUNE de ces 4 erreurs, is_flagged DOIT ÊTRE false.

LOT À ANALYSER :
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, date: e.date, description: e.description_detaillee })), null, 2)}

Réponds UNIQUEMENT en JSON, exactement avec ce format (sans markdown autour):
{
  "audit": [
    {
      "id": "...",
      "is_flagged": true/false,
      "error_types": ["ERREUR_DATE", "TITRE_IMPRECIS"], // Vide si is_flagged=false
      "justification": "Explication courte du problème", // Vide si is_flagged=false
      "suggested_correction": { 
         "titre": "Nouveau titre", 
         "date": "1910-01-01", // Conserve le format AAAA-MM-JJ, modifie juste l'année si besoin
         "description_detaillee": "Nouvelle description..." 
      }
    }
  ]
}`;

        const responseText = await callGemini(prompt);
        if (responseText) {
            try {
                // Nettoyage au cas où Gemini ajoute des backticks markdown (```json ... ```)
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                const jsonText = jsonMatch ? jsonMatch[0] : responseText;
                const data = JSON.parse(jsonText);

                if (data.audit && Array.isArray(data.audit)) {
                    const flaggedInBatch = data.audit.filter(e => e.is_flagged);
                    if (flaggedInBatch.length > 0) {
                        dbErreurs.push(...flaggedInBatch);
                        console.log(`   -> 🚩 ${flaggedInBatch.length} erreurs trouvées dans ce lot !`);
                        fs.writeFileSync(flagPath, JSON.stringify(dbErreurs, null, 2));
                    }

                    // Marquer comme traité
                    batch.forEach(e => processedIds.add(e.id));
                    fs.writeFileSync(logsPath, JSON.stringify(Array.from(processedIds), null, 2));
                }
            } catch (e) {
                console.error("❌ Erreur parsing JSON lot:", e.message);
                console.error("Texte reçu :", responseText);
            }
        }

        // Pause pour éviter le rate limit API
        await new Promise(r => setTimeout(r, 2500));
    }

    console.log("\n" + "=".repeat(40));
    console.log(`🏆 AUDIT GLOBAL TERMINÉ`);
    console.log(`🚩 Événements signalés au total : ${dbErreurs.length}`);
    console.log(`💾 Les suspects sont sauvés dans : machine_a_evenements/erreurs_detectees.json`);
    console.log("=".repeat(40));
}

auditGlobal();

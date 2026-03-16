import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const ECOLE_ART_FILE = path.join(__dirname, 'ecole_d_art_essentiels.md');

async function brainstormVisual(eventTitre, eventDesc) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const ecoleArt = await fs.readFile(ECOLE_ART_FILE, 'utf-8');

    const prompt = `
    Tu es un COLLECTIF d'agents de création (Archiviste, Directeur Artistique, et Critique).
    Votre mission est de concevoir le prompt PARFAIT pour l'événement : "${eventTitre}".

    ÉCOLE D'ART (Règles d'or) :
    ${ecoleArt}

    DÉROULEMENT DU BRAINSTORMING :
    1. **Archiviste** : Donne les détails techniques et historiques bruts de l'objet ou de la scène.
    2. **Directeur Artistique** : Propose une mise en scène dramatique et métonymique.
    3. **Critique** : Analyse la proposition. Est-ce scannable ? Est-ce que l'objet hero est bien mis en valeur ? Est-ce qu'on évite le PowerPoint ?
    4. **Synthèse (Prompt Final)** : Un prompt Flux Schnell en anglais, ultra-précis.

    RÈGLE SPÉCIALE POUR LES INVENTIONS :
    L'objet (ex: Télégraphe) DOIT être le "Hero" de l'image. Il doit être net, au centre ou occupant 40% du cadre, et reconnaissable immédiatement.

    Format de réponse JSON :
    {
        "brainstorm_log": "...",
        "critic_feedback": "...",
        "final_flux_prompt": "..."
    }
    `;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text().replace(/```json|```/g, ''));
    return response;
}

async function runBrainstormTest() {
    const tests = [
        { titre: "Invention du télégraphe optique par Claude Chappe", desc: "1793 : Premier système de communication visuel." },
        { titre: "Accords de Genève sur l'Indochine", desc: "1954 : Fin de la guerre d'Indochine, division du Vietnam au 17e parallèle." }
    ];

    for (const test of tests) {
        console.log(`\n🧠 Brainstorming pour : ${test.titre}...`);
        const result = await brainstormVisual(test.titre, test.desc);
        
        console.log(`💬 Log : ${result.brainstorm_log.substring(0, 100)}...`);
        console.log(`⚠️ Critique : ${result.critic_feedback}`);

        console.log("🎨 Génération Flux...");
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: { prompt: result.final_flux_prompt, aspect_ratio: "16:9" }
        });
        
        console.log(`✅ Image : ${Array.isArray(output) ? output[0] : output}`);
    }
}

runBrainstormTest().catch(console.error);

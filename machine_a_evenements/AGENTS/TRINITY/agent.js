
import fs from 'fs';
import path from 'path';
import Replicate from 'replicate';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';

import { GoogleGenerativeAI } from '@google/generative-ai';

const agentName = "TRINITY";
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function main() {
    const inputPath = path.join(process.cwd(), 'STORAGE/INPUT/task.json');
    if (!fs.existsSync(inputPath)) {
        console.log(`[${agentName}] Aucun fichier task.json trouvé.`);
        return;
    }

    const task = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const { titre, year, description, feedback } = task;

    console.log(`[${agentName}] Architecture du prompt pour : ${titre} (${year})`);

    let finalPrompt = description;

    // --- LOGIQUE PROMPT ARCHITECT (GEMINI) ---
    try {
        const isDeath = /mort|décès|assassinat|exécution/i.test(titre);
        let architectPrompt = "";

        if (feedback) {
            architectPrompt = `You are a Senior Prompt Engineer for FLUX (AI Image Generator) and a Historian.
The previous image generation FAILED historical inspection.
EVENT: "${titre}" in year ${year}.
PREVIOUS PROMPT: "${description}"
VERITAS FEEDBACK (Reasons for failure): "${feedback}"

MISSION: Rewrite the prompt to FIX these issues. 
- Use "Positive Reinforcement": instead of saying "no cars", describe the "muddy path with horse tracks and wooden carts".
- SPREAD THE DETAILS: Describe materials (wrought iron, rough-hewn stone, vegetable-dyed wool).
- SECURE THE ERA: Be extremely specific about technology and attire for ${year}.
${isDeath ? '- SAFETY: This is a death event. DO NOT SHOW A CORPSE, BLOOD OR VIOLENCE. Instead, show the person in a dignified setting, or a symbolic atmosphere representing their legacy.' : ''}

Output ONLY the new English prompt.`;
        } else {
            architectPrompt = `You are an Expert Prompt Engineer for FLUX as a historical artist.
EVENT: "${titre}" in year ${year}.
BASE DESCRIPTION: "${description}"

MISSION: Transform this into a high-fidelity, hyper-detailed prompt for FLUX.
- Focus on textures, lighting (candles, oil lamps, natural sun), and period-correct materials.
- Style: Cinematic historical photography, high detail.
- Ensure the scene feels "grounded" in ${year}.
${isDeath ? '- SPECIAL RULE FOR DEATH/PASSING: Focus on the DIGNITY of the person. Show them in their prime or in a reflective, atmospheric setting. NEVER show corpses, blood, or the act of dying. Focus on the legacy and the historical weight of the moment.' : ''}

Output ONLY the new English prompt.`;
        }

        const result = await gemini.generateContent(architectPrompt);
        finalPrompt = result.response.text().trim();
        console.log(`[${agentName}] Prompt optimisé par l'Architecte.`);
    } catch (e) {
        console.warn(`[${agentName}] Échec de l'optimisation Gemini, utilisation du prompt brut.`);
    }

    // Configuration identique à sevent3
    const guidanceScale = (year < 1500) ? 2.0 : (year < 1900) ? 2.5 : 3.0;
    const seed = Math.floor(Math.random() * 1000000000);

    const fluxConfig = {
        prompt: finalPrompt,
        aspect_ratio: "16:9",
        num_inference_steps: 4,
        output_format: "webp",
        output_quality: 90,
        seed: seed,
        guidance_scale: guidanceScale
    };

    try {
        console.log(`[${agentName}] Création de la prédiction Replicate...`);

        // On récupère le modèle pour avoir la version la plus récente
        const model = await replicate.models.get("black-forest-labs", "flux-schnell");

        // On crée la prédiction explicitement pour avoir le contrôle sur le polling
        let prediction = await replicate.predictions.create({
            version: model.latest_version.id,
            input: fluxConfig
        });

        console.log(`[${agentName}] Prédiction créée (ID: ${prediction.id}). En attente des pixels...`);

        // Boucle de polling robuste
        const start = Date.now();
        while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
            // Timeout de 60 secondes
            if (Date.now() - start > 60000) {
                throw new Error("Timeout Replicate (60s dépassées)");
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            prediction = await replicate.predictions.get(prediction.id);
            process.stdout.write("."); // Petit indicateur de vie
        }
        console.log("\n");

        if (prediction.status === "failed") {
            throw new Error(`La génération a échoué : ${prediction.error}`);
        }

        const output = prediction.output;
        let imageUrl = null;
        if (Array.isArray(output) && output.length > 0) {
            imageUrl = output[0];
        } else if (typeof output === 'string') {
            imageUrl = output;
        }

        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
            throw new Error(`Impossible de récupérer l'URL de l'image. Status: ${prediction.status}, Res: ${JSON.stringify(output)}`);
        }

        const result = {
            ...task,
            imageUrl,
            technical: {
                model: "flux-schnell",
                seed,
                guidanceScale,
                steps: 4,
                predictionId: prediction.id
            }
        };

        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/trinity_result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

        logDecision(agentName, 'GENERATE', { titre, year }, 'SUCCESS', 'Image générée avec succès', { imageUrl });
    } catch (error) {
        console.error(`\n[${agentName}] ERREUR:`, error.message);
        logDecision(agentName, 'GENERATE', { titre, year }, 'ERROR', error.message);
        process.exit(1);
    }
}

main();

import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const TARGETS = [
    {
        id: "7a07b33e-c64e-45fa-8874-e4e9a73b75cc",
        titre: "Loi Copé-Zimmermann sur les quotas de genre",
        desc: "Loi de 2011 imposant 40% de femmes dans les conseils d'administration des grandes entreprises."
    },
    {
        id: "c08b87bb-afd5-4a7d-898b-9a492a015663",
        titre: "Invention du télégraphe optique par Claude Chappe",
        desc: "1793 : Premier système de communication longue distance par bras articulés sur des tours."
    },
    {
        id: "6c796526-b920-4df3-b3ff-abc9610baf20",
        titre: "Accords de Grenelle sur la formation continue",
        desc: "1972 : Accords cruciaux permettant aux salariés de se former tout au long de leur vie professionnelle."
    }
];

async function runArchitectTest() {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const essentials = await fs.readFile(path.join(__dirname, 'ecole_d_art_essentiels.md'), 'utf-8');

    console.log("🚀 Lancement du Test Architecte (V3)...");

    for (const target of TARGETS) {
        console.log(`\n--- 🏗️ Architecture du concept pour : ${target.titre} ---`);

        const architectPrompt = `
        Tu es le Metteur en Scène (Stage Director) de l'École d'Art Timalaus. 
        Ton job : Transformer un événement poussiéreux en une scène de FILM DRAMATIQUE et TANGIBLE.

        RÈGLES D'ART (STRICTES) :
        ${essentials}

        ÉVÉNEMENT :
        Titre : ${target.titre}
        Description : ${target.desc}

        TRAVAIL REQUIS :
        1. Identifie la TENSION humaine et le "GRIT" (saleté, usure, texture).
        2. Choisis un angle de caméra "viscéral" (POV, macro sale, contre-plongée dramatique).
        3. Rédige le PROMPT final en ANGLAIS (Flux Schnell).
        4. OBLIGATION VISUELLE : Ajoute des détails de sueur, de bois usé, de métal taché, de grain de pellicule 35mm.

        Interdit : "clean", "office", "meeting", "modern skyscraper", "conceptual illustration", "stock photo style".
        Exigé : "Gritty realism", "documentary style", "heavy textures", "tangible atmosphere", "sweat and dust".

        Format de réponse (JSON strict) :
        {
            "concept": "...",
            "composition": "...",
            "flux_prompt": "..."
        }
        `;

        const result = await model.generateContent(architectPrompt);
        const response = JSON.parse(result.response.text().replace(/```json|```/g, ''));

        console.log(`💡 Concept : ${response.concept}`);
        console.log(`📐 Composition : ${response.composition}`);

        console.log(`🎨 Peinture en cours...`);
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: {
                prompt: response.flux_prompt,
                aspect_ratio: "16:9"
            }
        });

        const url = Array.isArray(output) ? output[0] : output;
        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `v3_test_${target.id.slice(0, 8)}.png`;
        const filePath = path.join(__dirname, 'temp_batch', fileName);
        
        await fs.writeFile(filePath, buffer);
        console.log(`✅ Image générée : ${filePath}`);
        console.log(`🔗 Lien : ${url}`);
    }
}

runArchitectTest().catch(console.error);


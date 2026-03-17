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

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const REPAIRS = [
    {
        id: "chappe_v4",
        prompt: "Extreme close-up of a Claude Chappe optical telegraph mechanism in 1793. Massive black wooden articulated arms moving against a dramatic cloudy sky. Detailed textures of weathered wood, iron bolts, and thick ropes. Historical accuracy, no humans, no modern clothes. Cinematic lighting, 18th century atmosphere. Masterpiece."
    },
    {
        id: "cope_v4",
        prompt: "Powerful cinematic shot of a successful woman in a tailored business suit in 2011. She is seen from behind, standing at the head of a massive, empty, polished dark wood boardroom table in a high-end modern skycraper office. Sunset light hitting the glass walls. Sense of leadership and achievement. No abstract symbols, high-end professional photography style."
    },
    {
        id: "grenelle_v4",
        prompt: "Top-down cinematic shot of a 1970s factory workbench. A worker's rough, calloused hand rests next to a vintage technical training booklet with 1972 typography and diagrams. Industrial tools, grease stains on the wood, warm golden era lighting. Authentic social history atmosphere, no metaphors, pure realism."
    }
];

async function runSurgicalRepair() {
    console.log("🛠️ Lancement de la réparation chirurgicale...");

    for (const repair of REPAIRS) {
        console.log(`🎨 Génération de : ${repair.id}...`);
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: {
                prompt: repair.prompt,
                aspect_ratio: "16:9"
            }
        });

        const url = Array.isArray(output) ? output[0] : output;
        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const filePath = path.join(__dirname, 'temp_batch', `${repair.id}.png`);
        
        await fs.writeFile(filePath, buffer);
        console.log(`✅ Récupéré : ${filePath} -> ${url}`);
    }
}

runSurgicalRepair().catch(console.error);


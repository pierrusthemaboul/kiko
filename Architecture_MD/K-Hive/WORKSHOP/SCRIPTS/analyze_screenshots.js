import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Polyfills
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Env
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const API_KEY = process.env.GEMINI_API_KEY;
const imagePaths = process.argv.slice(2);

if (imagePaths.length === 0) {
    console.error("Usage: node analyze_screenshots.js <img1> <img2> ...");
    process.exit(1);
}

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

async function main() {
    console.log(`🔍 Analyse de ${imagePaths.length} captures d'écran...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const parts = imagePaths.map(p => fileToGenerativePart(p, "image/png"));

    const prompt = `
    Tu es Game Designer. Analyse ces captures d'écran de l'interface du jeu.
    Je me suis trompé précédemment en disant que c'était du "Drag & Drop sur une frise".
    
    Regarde attentivement les éléments d'interface (Flèches, Textes, Position des cartes).
    
    1. **Quelle est l'action EXACTE du joueur ?** (Cliquer ? Swiper ? Glisser ?).
    2. **Analysons les flèches** : Que signifient "AVANT" et "APRÈS" ? 
    3. **La relation entre les cartes** : Comment la carte du bas interagit avec celle du haut ?
    4. **Conditions de Victoire/Défaite** : Que suggèrent les cœurs ❤️ et les jauges ?
    
    Rédige une description technique précise de la "Core Loop" du gameplay.
    `;

    try {
        const result = await model.generateContent([prompt, ...parts]);
        console.log(result.response.text());
    } catch (e) {
        console.error("❌ Erreur:", e.message);
    }
}

main();

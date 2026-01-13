import { GoogleGenerativeAI } from '@google/generative-ai';
import { execSync } from 'child_process';
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

// Config
const INPUT_PATH = process.argv[2];
const TEMP_DIR = path.join(__dirname, 'temp_analysis');
const API_KEY = process.env.GEMINI_API_KEY;

if (!INPUT_PATH) {
    console.error("❌ Usage: node analyze_gameplay.js <video_path>");
    process.exit(1);
}

if (!fs.existsSync(INPUT_PATH)) {
    console.error(`❌ Fichier introuvable : ${INPUT_PATH}`);
    process.exit(1);
}

// Nettoyage Temp
if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_DIR);

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

async function extractFrames(videoPath) {
    console.log("🎞️  Extraction des frames pour analyse...");
    try {
        // On prend 4 frames pour mieux comprendre le mouvement
        const timestamps = [1, 5, 10, 20];
        const frames = [];

        timestamps.forEach((time, index) => {
            const outputPath = path.join(TEMP_DIR, `frame_${index}.jpg`);
            try {
                execSync(`ffmpeg -y -ss ${time} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' });
                if (fs.existsSync(outputPath)) frames.push(outputPath);
            } catch (e) { }
        });

        // Fallback si vidéo courte
        if (frames.length === 0) {
            const outputPath = path.join(TEMP_DIR, `frame_0.jpg`);
            execSync(`ffmpeg -y -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' });
            if (fs.existsSync(outputPath)) frames.push(outputPath);
        }

        return frames;
    } catch (e) {
        console.error("❌ Erreur ffmpeg:", e.message);
        return [];
    }
}

async function main() {
    const frames = await extractFrames(INPUT_PATH);
    const imageParts = frames.map(f => fileToGenerativePart(f, "image/jpeg"));

    if (imageParts.length === 0) {
        console.error("❌ Impossible d'analyser (Pas d'images).");
        process.exit(1);
    }

    console.log(`🧠 L'IA analyse le Gameplay...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Analyse cette vidéo de jeu vidéo. J'ai besoin de comprendre comment ça marche.
    
    Décris-moi :
    1. **Le Genre** (ex: FPS, Puzzle, Stratégie).
    2. **Le But du Jeu** (Que semble faire le joueur ?).
    3. **L'Interface (UI)** : Qu'y a-t-il à l'écran ? (Barres de vie, scores, cartes...).
    4. **L'Ambiance** : Graphismes, style (rétro, réaliste, cartoon...).
    
    Sois précis, comme un Game Designer qui analyse un concurrent.
    `;

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        console.log("\n------------------------------------------------");
        console.log("🎮 ANALYSE DU GAMEPLAY");
        console.log("------------------------------------------------\n");
        console.log(response.text());
        console.log("\n------------------------------------------------");
    } catch (e) {
        console.error("❌ Erreur Gemini:", e.message);
    }

    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

main();

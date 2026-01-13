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
const TEMP_DIR = path.join(__dirname, 'temp_critic');
const API_KEY = process.env.GEMINI_API_KEY;

if (!INPUT_PATH || !fs.existsSync(INPUT_PATH)) {
    console.error(`❌ Usage: node critic.js <file_path>`);
    console.error(`❌ Erreur: Fichier introuvable.`);
    process.exit(1);
}

if (!API_KEY) {
    console.error(`❌ Erreur: GEMINI_API_KEY manquante.`);
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
    console.log("🎞️  Extraction frames vidéo...");
    try {
        const timestamps = [2, 15, 28]; // Début, milieu, fin (approximatif pour 30s)
        const frames = [];

        timestamps.forEach((time, index) => {
            const outputPath = path.join(TEMP_DIR, `frame_${index}.jpg`);
            // On tente d'extraire. Si la vidéo est plus courte, ffmpeg gérera ou failera silencieusement.
            try {
                execSync(`ffmpeg -y -ss ${time} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' });
                if (fs.existsSync(outputPath)) frames.push(outputPath);
            } catch (e) { }
        });

        // Si vidéo très courte (< 2s), on prend juste la frame 0
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
    const ext = path.extname(INPUT_PATH).toLowerCase();
    let imageParts = [];
    let mediaType = "unknown";

    if (['.mp4', '.mov', '.avi', '.webm'].includes(ext)) {
        mediaType = "video";
        const frames = await extractFrames(INPUT_PATH);
        imageParts = frames.map(f => fileToGenerativePart(f, "image/jpeg"));
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        mediaType = "image";
        imageParts = [fileToGenerativePart(INPUT_PATH, ext === '.png' ? "image/png" : "image/jpeg")];
    } else {
        console.error("❌ Format non supporté.");
        process.exit(1);
    }

    if (imageParts.length === 0) {
        console.error("❌ Impossible d'analyser le fichier (Pas d'image extraite).");
        process.exit(1);
    }

    console.log(`🧠 Analyse QA IA (${mediaType}) en cours...`);

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Tu es LE CRITIQUE DE QUALITÉ (QA) de l'agence Timalaus.
    
    TA MISSION : Valider ou Rejeter ce contenu (${mediaType}) avant publication TikTok.
    
    CRITÈRES DE REJET IMPÉRATIFS (Note < 5) :
    - Écran noir ou image corrompue.
    - Texte illisible ou coupé.
    - Logo Timalaus absent (si visible).
    - Contenu offensant ou NSFW.
    
    CRITÈRES DE QUALITÉ (Note 5-10) :
    - Esthétique soignée.
    - Clarté du message.
    - Potentiel viral.

    Réponds EXCLUSIVEMENT au format JSON :
    {
        "note": number (0-10),
        "status": "VALIDÉ" | "REJETÉ" (Rejeté si note < 7),
        "commentaire": "Pourquoi ?",
        "conseil": "Action corrective précise"
    }
    `;

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        // Parsing JSON un peu robuste
        const jsonStr = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        console.log(jsonStr);
    } catch (e) {
        console.error("❌ Erreur Gemini:", e.message);
    }

    // Nettoyage
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

main();

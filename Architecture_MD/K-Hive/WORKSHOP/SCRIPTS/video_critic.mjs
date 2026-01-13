import { GoogleGenerativeAI } from '@google/generative-ai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Polyfill pour __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement explicite du .env à la racine du projet
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

// Config
const VIDEO_PATH = process.argv[2];
const TEMP_DIR = path.join(__dirname, 'temp_frames');
const API_KEY = process.env.GEMINI_API_KEY;

if (!VIDEO_PATH) {
    console.error("❌ Usage: node video_critic.mjs <video_path>");
    process.exit(1);
}

if (!fs.existsSync(VIDEO_PATH)) {
    console.error(`❌ Vidéo introuvable : ${VIDEO_PATH}`);
    process.exit(1);
}

if (!API_KEY) {
    console.error(`❌ Erreur: GEMINI_API_KEY manquante. (Cherché dans: ${envPath})`);
    process.exit(1);
}

// Nettoyage / Création Temp
if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_DIR);

async function extractFrames() {
    console.log("🎞️  Extraction des frames (Début, Milieu, Fin)...");
    try {
        const timestamps = [2, 15, 28];

        timestamps.forEach((time, index) => {
            const outputPath = path.join(TEMP_DIR, `frame_${index}.jpg`);
            execSync(`ffmpeg -y -ss ${time} -i "${VIDEO_PATH}" -vframes 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' });
        });

        return fs.readdirSync(TEMP_DIR).map(f => path.join(TEMP_DIR, f));
    } catch (e) {
        console.error("❌ Erreur ffmpeg (Vérifiez que ffmpeg est installé):", e.message);
        return [];
    }
}

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

async function critiqueVideo(imagePaths) {
    console.log("🧠 Analyse IA en cours (Gemini 2.0 Flash)...");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Tu es Léa, Directrice Artistique Senior chez Timalaus (Jeu mobile historique).
    Tu dois valider cette vidéo de gameplay pour une publication TikTok.
    
    Analyse ces 3 captures d'écran (Début, Milieu, Fin).
    
    Critères :
    1. Est-ce qu'on voit bien le jeu ? (Pas d'écran noir, pas de bug graphique majeur).
    2. Est-ce qu'il se passe quelque chose ? (Mouvement, interface visible).
    3. Esthétique : Est-ce propre ?
    
    Réponds EXCLUSIVEMENT au format JSON suivant :
    {
        "note": number (0-10),
        "status": "VALIDÉ" | "REJETÉ",
        "commentaire": "Ton avis court et constructif (max 1 phrase)",
        "conseil": "Un conseil pour Hugo si c'est rejeté"
    }
    `;

    const imageParts = imagePaths.map(p => fileToGenerativePart(p, "image/jpeg"));

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        console.log("\n------------------------------------------------");
        console.log(`🧐 VERDICT DE LÉA`);
        console.log(`------------------------------------------------`);
        console.log(`NOTE       : ${analysis.note}/10`);
        console.log(`STATUT     : ${analysis.status === 'VALIDÉ' ? '✅ VALIDÉ' : '❌ REJETÉ'}`);
        console.log(`AVIS       : ${analysis.commentaire}`);
        if (analysis.status !== 'VALIDÉ') {
            console.log(`CONSEIL    : ${analysis.conseil}`);
        }
        console.log("------------------------------------------------\n");

    } catch (e) {
        console.error("❌ Erreur Gemini:", e);
    }
}

async function main() {
    const frames = await extractFrames();
    if (frames.length > 0) {
        await critiqueVideo(frames);
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    } else {
        console.error("❌ Aucune frame extraite.");
    }
}

main();

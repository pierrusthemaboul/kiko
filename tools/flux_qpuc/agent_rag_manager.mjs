import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
const STATE_FILE = path.join(__dirname, '.rag_state.json');

// Chemin absolu forcé vers la racine du projet
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const ARCHIVE_PATH = path.join(PROJECT_ROOT, 'data', 'qpuc_archives.json');

export async function syncArchiveWithGemini() {
    console.log("📁 [RAG] Synchronisation de l'archive...");
    
    if (!fs.existsSync(ARCHIVE_PATH)) {
        console.log(`⚠️ Archive absente à ${ARCHIVE_PATH}. Création...`);
        if (!fs.existsSync(path.dirname(ARCHIVE_PATH))) fs.mkdirSync(path.dirname(ARCHIVE_PATH), { recursive: true });
        fs.writeFileSync(ARCHIVE_PATH, JSON.stringify([], null, 2));
    }

    try {
        const uploadResult = await fileManager.uploadFile(ARCHIVE_PATH, {
            mimeType: "text/plain",
            displayName: "QPUC Store",
        });

        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === "PROCESSING") {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }

        const state = { fileUri: file.uri, updatedAt: new Date().toISOString() };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log("✅ [RAG] Store à jour.");
        return state;
    } catch (err) {
        console.error("❌ [RAG] Erreur:", err.message);
        return null;
    }
}

export async function getLatestArchiveContext() {
    if (!fs.existsSync(STATE_FILE)) return null;
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

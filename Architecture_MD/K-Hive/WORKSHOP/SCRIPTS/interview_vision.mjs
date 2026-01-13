import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { process.exit(1); }

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const LOUIS_PERSONA = fs.readFileSync(path.join(__dirname, '../../AGENTS/N2/LOUIS.md'), 'utf-8');
const ROADMAP = fs.readFileSync(path.join(__dirname, '../../KNOWLEDGE_BASE/ROADMAP.md'), 'utf-8');

async function askLouis() {
    console.log("🎤 Interview de Vision avec LOUIS...");

    // On ne lui donne PAS la bonne réponse. On lui demande ce qu'il a dans le ventre.
    const prompt = `
    ROLE:
    ${LOUIS_PERSONA}

    CONTEXTE (Ta mémoire):
    ${ROADMAP}

    QUESTION DU CEO (Pierre) :
    "Louis, arrête tout. C'est quoi ton but UNIQUE aujourd'hui ? Pourquoi on paye des gens ? Réponds en une phrase."
    `;

    const result = await model.generateContent(prompt);
    console.log(`\n🗣️ RÉPONSE DE LOUIS :\n"${result.response.text().trim()}"\n`);
}

askLouis();

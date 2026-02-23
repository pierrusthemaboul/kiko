import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini2() {
    console.log("🧪 Test de Gemini 2.0 Flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Bonjour, es-tu opérationnel ? Réponds juste 'OUI' si c'est le cas.");
        const response = await result.response;
        console.log(`Réponse de l'IA : ${response.text().trim()}`);
    } catch (e) {
        console.error("❌ Échec avec 'gemini-2.0-flash' :", e.message);
    }
}

testGemini2();

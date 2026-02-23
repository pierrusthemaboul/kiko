import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // Note: The SDK might not have a direct listModels but we can try to see what works
        console.log("Checking model 'gemini-1.5-flash'...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("test");
        console.log("Success with 'gemini-1.5-flash'");
    } catch (e) {
        console.error("Failed with 'gemini-1.5-flash':", e.message);

        try {
            console.log("Checking model 'gemini-1.5-pro'...");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const result = await model.generateContent("test");
            console.log("Success with 'gemini-1.5-pro'");
        } catch (e2) {
            console.error("Failed with 'gemini-1.5-pro':", e2.message);
        }
    }
}

listModels();

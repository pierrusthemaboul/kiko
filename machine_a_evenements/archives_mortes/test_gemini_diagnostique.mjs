
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function testGemini() {
    console.log("🧪 Tentative de connexion aux nouveaux modèles Gemini (2.0/2.5)...");
    console.log("Clé utilisée :", process.env.GEMINI_API_KEY.substring(0, 10) + "...");

    const modelsToTest = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-flash"];

    for (const modelName of modelsToTest) {
        console.log(`\n🔍 Test avec le modèle : ${modelName}...`);
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent("Répète après moi : 'Gemini est opérationnel'");
            const response = await result.response;
            console.log(`✅ Success avec ${modelName} :`, response.text());
            return;
        } catch (e) {
            console.error(`❌ Échec avec ${modelName} : ${e.message}`);
        }
    }
    console.error("\n💀 Tous les modèles ont échoué.");
}

testGemini();

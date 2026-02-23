
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // La méthode listModels n'est pas directement sur genAI dans cette version du SDK ?
        // On va essayer d'appeler l'API directement si besoin, mais d'abord vérifions si on peut l'avoir via le SDK
        console.log("Tentative de récupération de la liste des modèles...");
        // En fait le SDK JS n'a pas forcément de méthode listModels directe.
        // On va tester un modèle plus "basique" au cas où.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Test");
        console.log("Succès avec gemini-pro !");
    } catch (e) {
        console.error("Erreur :", e.message);
    }
}

listModels();

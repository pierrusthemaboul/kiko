import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

/**
 * 🧪 TEST ÉTAPE 2 : IA GEMINI
 * Objectif : Vérifier que la clé API fonctionne.
 * Coût : ~0.001 centime (un seul appel court).
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testIA() {
  console.log("--- 🧪 TEST IA GEMINI ---");
  console.log(`📡 Connexion avec la clé : ${process.env.GEMINI_API_KEY.substring(0, 8)}...`);
  
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  try {
    const result = await model.generateContent("Donne-moi un thème typique du jeu 'Quatre à la suite' sur l'Histoire.");
    const response = result.response.text();
    console.log(`✅ IA Répond : "${response.trim()}"`);
  } catch (error) {
    console.error("❌ Échec IA :", error.message);
  }
}

testIA();

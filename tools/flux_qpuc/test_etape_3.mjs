import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

/**
 * 🧪 TEST ÉTAPE 3 : INVESTIGATEUR (Un seul événement)
 * Objectif : Générer un événement QPUC au format JSON pour le SAS.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testInvestigation() {
  console.log("--- 🧪 TEST INVESTIGATION UNitaire ---");
  
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: "Tu es le Curateur KIKO. Génère un événement ponctuel historique (Année UNIQUE >= 1). Format JSON : { \"ev\": { \"titre\", \"date\", \"description\", \"wikidata_id\" } }"
  });
  
  try {
    const result = await model.generateContent("Génère un événement sur le thème 'Les Rois de France'.");
    const jsonStr = result.response.text().replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);
    
    console.log("✅ Événement Candidat Géré :");
    console.log(`   - Titre : ${data.ev.titre}`);
    console.log(`   - Date : ${data.ev.date}`);
    console.log(`   - Wikidata : ${data.ev.wikidata_id || 'N/A'}`);
  } catch (error) {
    console.error("❌ Échec Investigation :", error.message);
  }
}

testInvestigation();

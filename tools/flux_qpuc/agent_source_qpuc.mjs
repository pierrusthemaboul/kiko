import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

/**
 * 📺 AGENT SOURCE QPUC (Extraction sans Cheerio)
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getThemesFromWikipedia() {
  console.log("📺 Extraction des thèmes QPUC sur Wikipédia (Méthode Légère)...");
  
  const url = 'https://fr.wikipedia.org/wiki/Questions_pour_un_champion';
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'KikoBot/1.0 (kiko-admin-local)'
      }
    });
    
    const cleanText = data.replace(/<[^>]*>?/gm, ' ').substring(0, 20000);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Voici le contenu d'une page sur l'émission 'Questions pour un champion'. 
    Extrais 20 thèmes de culture générale TRÈS PRÉCIS typiques de l'émission (ex: 'Les reines de France du Moyen-Âge', 'La conquête spatiale soviétique', 'Les compositeurs baroques').
    Évite les thèmes trop génériques.
    Réponds UNIQUEMENT en JSON : { "themes": ["Thème 1", ...] }`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(response);
    
    return parsed.themes;
  } catch (error) {
    console.error("❌ Erreur source QPUC:", error.message);
    return ["Les Rois de France", "La Seconde Guerre Mondiale", "Les Grandes Inventions"];
  }
}

export { getThemesFromWikipedia };


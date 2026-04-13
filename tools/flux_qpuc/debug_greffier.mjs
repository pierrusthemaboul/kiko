import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const GREFFIER_PROMPT = `
Tu es le Greffier de l'Histoire pour le jeu KIKO. 
Ton rôle est de confirmer avec une certitude absolue l'ANNÉE UNIQUE d'un événement historique.
Utilise des recherches sur Wikipedia et l'analyse sémantique.
RÈGLES :
- Uniquement l'année (ex: 1789). Pas de jour, pas de mois.
- Interdiction d'événements avant Jésus Christ (Année >= 1).
- Si l'événement est flou dans le temps (ex: un règne qui dure 40 ans), cherche l'événement pivot unique qui en marque le début ou la fin, mais ne donne JAMAIS de plage de dates.
- Compare ce que tu trouves avec l'année fournie par l'Investigateur.
`;

async function verifyWithWikidata(wikidataId) {
  if (!wikidataId || !wikidataId.startsWith('Q')) return null;
  
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'KikoBot/1.0 (kiko-admin-local)',
        'Accept': 'application/json'
      }
    });
    const entity = data.entities[wikidataId];
    
    // On cherche la propriété P585 (point in time) qui est la plus précise
    // Ou P580 (start time) pour un début d'événement.
    const p585 = entity.claims && entity.claims['P585'];
    const p580 = entity.claims && entity.claims['P580'];
    
    const claim = p585 || p580;
    if (claim && claim[0].mainsnak.datavalue) {
       const wikiTime = claim[0].mainsnak.datavalue.value.time;
       // Format : "+1789-01-01T00:00:00Z" (donc on prend l'année)
       const yearMatch = wikiTime.match(/\+?(-?\d+)-/);
       return yearMatch ? parseInt(yearMatch[1]) : null;
    }
    return null;
  } catch (error) {
    console.error(`❌ Erreur Wikidata (${wikidataId}):`, error.message);
    return null;
  }
}

async function verifyWithGeminiWiki(titre, suggestedYear) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", // Plus rapide pour du factuel léger
    systemInstruction: GREFFIER_PROMPT 
  });

  const prompt = `L'événement est : "${titre}". L'Investigateur propose l'année : ${suggestedYear}. 
  Est-ce correct ? D'après tes connaissances historiques et Wikipedia, quelle est l'année UNIQUE la plus pertinente pour résumer cet événement en un seul point temporel ?
  Réponds UNIQUEMENT par l'année (ex: 1789). Si c'est douteux, réponds "INCERTAIN".`;

  try {
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    return answer === "INCERTAIN" ? null : parseInt(answer);
  } catch (err) {
    return null;
  }
}

async function debugEvent(titre, annee, wikidataId) {
    console.log(`🔍 DEBUG pour : "${titre}" (${annee}) - Wikidata: ${wikidataId}`);
    
    console.log('\n--- Test Wikipedia (Gemini) ---');
    const wikiDate = await verifyWithGeminiWiki(titre, annee);
    console.log(`Résultat Wikipedia: ${wikiDate}`);
    
    console.log('\n--- Test Wikidata ---');
    const wikidataDate = await verifyWithWikidata(wikidataId);
    console.log(`Résultat Wikidata: ${wikidataDate}`);
    
    console.log('\n--- Analyse ---');
    console.log(`Année suggérée: ${annee}`);
    console.log(`Wikipedia confirme: ${wikiDate === annee ? '✅' : '❌'} (${wikiDate})`);
    console.log(`Wikidata confirme: ${wikidataDate === annee ? '✅' : '❌'} (${wikidataDate})`);
    console.log(`Consensus: ${(wikiDate === annee && wikidataDate === annee) ? '✅' : '❌'}`);
}

debugEvent("Expédition du Vega", 1878, "Q319542");

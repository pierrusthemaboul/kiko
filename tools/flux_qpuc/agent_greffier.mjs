import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Chargement explicite du .env depuis la racine
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * ⚖️ AGENT GREFFIER (Flux QPUC - Version Simplifiée "Double-Audit")
 * 🔬 Rôle : Audit à l'aveugle via GPT-4o-mini.
 * On ne se fie plus aux APIs externes (Wiki/Wikidata) trop instables.
 * La sécurité repose sur la concordance entre Gemini (Investigateur) et GPT (Greffier).
 */

const BLIND_AUDIT_PROMPT = `
Tu es un historien expert. Ton rôle est de donner l'ANNÉE PRÉCISE d'un événement historique.
RÈGLES : 
- Réponds UNIQUEMENT par l'année en chiffres (ex: 1789).
- Pas de texte avant ou après.
- Si l'événement est avant J.-C., répond 'REJET'.
- Si l'événement est une période (ex: Guerre de Cent Ans), répond 'REJET'.
- Si tu ignores la date exacte, répond 'NULL'.
`;

/**
 * 🕵️‍♂️ AUDIT À L'AVEUGLE (GPT-4o-mini)
 */
async function blindAuditYear(titre) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BLIND_AUDIT_PROMPT },
        { role: "user", content: `Événement : "${titre}"` }
      ],
      temperature: 0
    });

    const answer = response.choices[0].message.content.trim();
    if (answer === 'REJET') return -1;
    if (answer === 'NULL') return null;
    
    const year = parseInt(answer.replace(/[^0-9]/g, ''));
    return (year >= 1) ? year : null;
  } catch (err) {
    console.error("   ⚠️ [GPT-4o-mini] Erreur :", err.message);
    return null;
  }
}

/**
 * 🚀 VÉRIFICATION DOUBLE (Gemini vs GPT-4o-mini)
 */
async function tripleVerification(titre, suggestedYear) {
  console.log(`⚖️ [GREFFIER] Audit à l'aveugle (GPT-4o-mini) : "${titre}"...`);
  
  const blindYear = await blindAuditYear(titre);
  
  console.log(`   📊 [RÉSULTAT] GPT: ${blindYear || '??'}, Suggéré: ${suggestedYear}`);
  
  if (blindYear === -1) {
    console.log(`   ❌ [REJET] Événement J.-C. ou Non-ponctuel.`);
    return { consensus: false, status: 'REJET', finalYear: null };
  }

  // MATCH PARFAIT EXIGÉ
  if (blindYear === suggestedYear) {
     console.log(`   ✅ [VALIDE] Les deux modèles sont d'accord sur ${suggestedYear}.`);
     return { consensus: true, status: 'VALIDE', finalYear: suggestedYear };
  } else {
     console.log(`   ❌ [DIVERGENCE] GPT propose ${blindYear || 'NULL'}. Rejet par sécurité.`);
     return { consensus: false, status: 'REJET', finalYear: null };
  }
}

export { tripleVerification };

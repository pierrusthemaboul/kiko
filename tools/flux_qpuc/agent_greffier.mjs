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
CONSIGNES : 
- Réponds UNIQUEMENT par l'année en chiffres (ex: 1789).
- Si l'événement est avant J.-C., réponds 'REJET'.
- Si l'événement est une période longue (ex: Guerre de Cent Ans, Règne de...), réponds 'REJET'.
- Si l'événement a plusieurs dates possibles selon le contexte, utilise le CONTEXTE fourni pour trancher.
- Si tu ignores la date exacte ou si c'est trop vague, réponds 'NULL'.
- JAMAIS de texte additionnel, juste l'année ou un mot-clé.
`;

/**
 * 🕵️‍♂️ AUDIT À L'AVEUGLE (GPT-4o-mini)
 */
async function blindAuditYear(titre, contexte = "") {
  try {
    const userContent = contexte 
      ? `Événement : "${titre}"\nContexte thématique : "${contexte}"`
      : `Événement : "${titre}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BLIND_AUDIT_PROMPT },
        { role: "user", content: userContent }
      ],
      temperature: 0
    });

    const answer = response.choices[0].message.content.trim().toUpperCase();
    
    if (answer.includes('REJET')) return -1;
    if (answer.includes('NULL')) return null;
    
    const digitsOnly = answer.replace(/[^0-9]/g, '');
    if (!digitsOnly) return null;

    const year = parseInt(digitsOnly);
    return (year >= 1) ? year : null;
  } catch (err) {
    console.error("   ⚠️ [GPT-4o-mini] Erreur :", err.message);
    return null;
  }
}

/**
 * 🚀 VÉRIFICATION DOUBLE (Gemini vs GPT-4o-mini)
 */
async function tripleVerification(titre, suggestedYear, contexte = "") {
  console.log(`⚖️ [GREFFIER] Audit à l'aveugle (GPT-4o-mini) : "${titre}"...`);
  
  const blindYear = await blindAuditYear(titre, contexte);
  
  console.log(`   📊 [RÉSULTAT] GPT: ${blindYear || '??'}, Suggéré: ${suggestedYear}`);
  
  if (blindYear === -1) {
    console.log(`   ❌ [REJET] Événement J.-C., Non-ponctuel ou Hors-contexte.`);
    return { consensus: false, status: 'REJET', finalYear: null };
  }

  // MATCH PARFAIT EXIGÉ (On tolère +/- 1 an pour les sources divergentes si nécessaire, mais restons strict pour l'instant)
  if (blindYear === suggestedYear) {
     console.log(`   ✅ [VALIDE] Les deux modèles sont d'accord sur ${suggestedYear}.`);
     return { consensus: true, status: 'VALIDE', finalYear: suggestedYear };
  } else {
     console.log(`   ❌ [DIVERGENCE] GPT propose ${blindYear || 'NULL'}. Rejet par sécurité.`);
     return { consensus: false, status: 'REJET', finalYear: null };
  }
}

export { tripleVerification };

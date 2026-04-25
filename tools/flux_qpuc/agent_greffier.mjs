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
Tu es un expert en datation. Réponds UNIQUEMENT par l'année (chiffres). 
Si l'événement est avant J.-C., ajoute "av. J.-C.".
Si tu ne connais pas, réponds "NULL".
Ne donne aucune explication, aucun texte, juste la date.
`;

/**
 * 🕵️‍♂️ AUDIT À L'AVEUGLE (GPT-4o-mini)
 * Retourne { year, prompt, response, reason }
 */
async function blindAuditYear(titre, contexte = "") {
  const userContent = `En quelle année a eu lieu "${titre}" ?`;
  const promptLog = userContent;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BLIND_AUDIT_PROMPT },
        { role: "user", content: userContent }
      ],
      temperature: 0
    });

    const rawAnswer = response.choices[0].message.content.trim();
    const answer = rawAnswer.toUpperCase();

    let yearResult = null;
    if (answer.includes('AV. J.-C.') || answer.includes('BC')) {
        yearResult = -1; // On garde -1 pour dire "Rejet car Avant J.-C."
    } else if (answer.includes('NULL')) {
        yearResult = null;
    } else {
        // Extraction des chiffres uniquement (on prend le premier nombre trouvé)
        const match = answer.match(/\d+/);
        if (match) {
            yearResult = parseInt(match[0]);
        }
    }

    return {
        year: yearResult,
        prompt: promptLog,
        response: rawAnswer,
        reason: ""
    };
  } catch (err) {
    console.error("   ⚠️ [GPT-4o-mini] Erreur :", err.message);
    return { year: null, prompt: promptLog, response: "ERREUR API", reason: err.message };
  }
}

/**
 * 🚀 VÉRIFICATION DOUBLE (Gemini vs GPT-4o-mini)
 * Retourne { consensus, status, finalYear, auditDetails }
 */
async function tripleVerification(titre, suggestedYear, contexte = "") {
  const audit = await blindAuditYear(titre, contexte);
  const blindYear = audit.year;
  
  const auditDetails = [{
    step: "Audit Greffier (GPT-4o-mini)",
    prompt: audit.prompt,
    response: audit.response,
    reason: audit.reason
  }];

  if (blindYear === -1) {
    return { consensus: false, status: 'REJET', finalYear: -1, auditDetails };
  }

  // MATCH PARFAIT EXIGÉ
  if (blindYear === suggestedYear) {
     return { consensus: true, status: 'VALIDE', finalYear: suggestedYear, auditDetails };
  } else {
     return { consensus: false, status: 'REJET', finalYear: blindYear, auditDetails };
  }
}

export { tripleVerification };

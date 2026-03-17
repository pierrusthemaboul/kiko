import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logDecision } from '../shared_utils.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_NAME = 'SCOREUR';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_FAST || 'gemini-2.0-flash',
  generationConfig: { responseMimeType: 'application/json' }
});

const STORAGE = {
  input: path.join(__dirname, 'STORAGE/INPUT/batch.json'),
  output: path.join(__dirname, 'STORAGE/OUTPUT/scoreur_result.json'),
  logs: path.join(__dirname, 'STORAGE/LOGS')
};

function buildPrompt(events) {
  const eventsText = events.map((e, i) => `Événement ${i + 1} (code: ${e.code || e.id}):
- Titre: ${e.titre}
- Date: ${e.date} (précision: ${e.date_precision || 'exact'})
- Pays: ${(e.pays || []).join(', ') || 'non renseigné'}
- Région: ${e.region || 'non renseignée'}
- Époque: ${e.epoque || 'non renseignée'}
- Types: ${(e.types_evenement || []).join(', ') || 'non renseignés'}
- Notoriété: ${e.notoriete !== null && e.notoriete !== undefined ? e.notoriete + '/100' : 'non renseignée'}
- Description: ${e.description_detaillee || 'non renseignée'}`).join('\n---\n');

  return `Tu es un historien expert. Analyse chaque événement ci-dessous et évalue sa fiabilité interne.

Pour chaque événement, vérifie :
1. COHÉRENCE DATE/ÉPOQUE : La date correspond-elle à l'époque indiquée ?
2. COHÉRENCE GÉO : Les pays/région sont-ils cohérents avec l'événement décrit ?
3. PLAUSIBILITÉ TITRE : Le titre est-il plausible pour cette période et ce lieu ?
4. COHÉRENCE DESCRIPTION : La description est-elle cohérente avec le titre et la date ?
5. NOTORIÉTÉ : Le score de notoriété est-il plausible pour cet événement ?

Flags disponibles (utilise uniquement ceux qui s'appliquent) :
- "date_suspect" : la date semble incorrecte ou incohérente avec l'époque
- "geo_suspect" : les pays/région semblent incorrects pour cet événement
- "anachronisme" : anachronisme détecté dans la description ou le contexte
- "incoherence_type" : les types ne correspondent pas à la description
- "notoriete_suspect" : le score de notoriété semble aberrant
- "description_vague" : description trop vague pour évaluer la fiabilité
- "titre_suspect" : le titre semble incorrect ou ne correspond pas aux données

Score de confiance :
- 90-100 : aucun problème détecté, événement cohérent
- 70-89 : quelques ambiguïtés mineures
- 50-69 : suspect, vérification recommandée
- 0-49 : très suspect, probablement une erreur

Réponds UNIQUEMENT en JSON valide avec ce format exact :
{
  "results": [
    {
      "code": "code_de_l_evenement",
      "score_confiance": 85,
      "flags": [],
      "raison": "Explication concise en 1-2 phrases."
    }
  ]
}

ÉVÉNEMENTS À ANALYSER :
${eventsText}`;
}

async function scoreWithRetry(events, retries = 3) {
  let delay = 2000;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(buildPrompt(events));
      const text = result.response.text();
      const parsed = JSON.parse(text);
      return parsed.results || parsed;
    } catch (err) {
      if (i < retries - 1) {
        console.warn(`[${AGENT_NAME}] Retry ${i + 1}/${retries} : ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log(`[${AGENT_NAME}] Démarrage...`);

  fs.mkdirSync(path.dirname(STORAGE.output), { recursive: true });
  fs.mkdirSync(STORAGE.logs, { recursive: true });

  if (!fs.existsSync(STORAGE.input)) {
    console.error(`[${AGENT_NAME}] Aucun batch trouvé : ${STORAGE.input}`);
    process.exit(1);
  }

  const events = JSON.parse(fs.readFileSync(STORAGE.input, 'utf-8'));
  console.log(`[${AGENT_NAME}] Scoring de ${events.length} événements...`);

  const results = await scoreWithRetry(events);

  // Map code → { id, code } pour enrichir les résultats avec l'UUID
  const codeToMeta = {};
  for (const e of events) {
    codeToMeta[e.code || e.id] = { id: e.id, code: e.code };
  }

  const enriched = results.map(r => ({
    ...r,
    evenement_id: codeToMeta[r.code]?.id || null
  }));

  const notMatched = enriched.filter(r => !r.evenement_id).length;
  if (notMatched > 0) {
    console.warn(`[${AGENT_NAME}] ${notMatched} résultats sans evenement_id (code non reconnu)`);
  }

  fs.writeFileSync(STORAGE.output, JSON.stringify(enriched, null, 2));

  const suspicious = enriched.filter(r => r.score_confiance < 70).length;
  console.log(`[${AGENT_NAME}] Terminé. ${enriched.length} scorés, ${suspicious} suspects (< 70)`);

  logDecision(
    AGENT_NAME, 'SCORE',
    { count: events.length },
    'SUCCESS',
    `Batch scoré : ${suspicious} suspects sur ${enriched.length}`,
    { output: STORAGE.output, suspicious, notMatched }
  );
}

main().catch(err => {
  console.error(`[${AGENT_NAME}] Erreur fatale :`, err);
  process.exit(1);
});


import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_NAME = 'ARBITRE';

const STORAGE = {
  input: path.join(__dirname, 'STORAGE/INPUT/batch.json'),
  output: path.join(__dirname, 'STORAGE/OUTPUT/arbitre_result.json'),
  logs: path.join(__dirname, 'STORAGE/LOGS')
};

function buildPrompt(events) {
  const eventsText = events.map((e, i) => `Événement ${i + 1} (code: ${e.code || e.id}) :
- Titre: ${e.titre}
- Date originale: ${e.date} → année ${e.original_year}
- Pays: ${(e.pays || []).join(', ') || 'N/A'}
- Région: ${e.region || 'N/A'}
- Époque: ${e.epoque || 'N/A'}
- Types: ${(e.types_evenement || []).join(', ') || 'N/A'}
- Description: ${e.description_detaillee || 'N/A'}

Résultat du blind test (Claude Haiku sans voir la date) :
- Année estimée: ${e.estimated_year}
- Intervalle: ${e.year_min} – ${e.year_max}
- Confiance: ${e.blind_confidence}/100
- Raisonnement: ${e.blind_reasoning}

Flags du Scoreur: ${(e.flags || []).join(', ') || 'aucun'}
Écart: ${e.delta_years} ans`).join('\n===\n');

  return `Tu es un historien expert et arbitre de dernière instance. Pour chaque événement, tu dois trancher : la date originale est-elle correcte, ou le blind test révèle-t-il une erreur probable ?

Verdicts possibles :
- "DATE_ORIGINALE_CORRECTE" : la date originale semble juste malgré l'écart
- "BLIND_DATE_PLUS_PROBABLE" : le blind test est plus convaincant, la date originale est probablement fausse
- "INCERTAIN" : impossible de trancher avec confiance, investigation humaine requise
- "ERREUR_GRAVE" : erreur manifeste, anachronisme ou impossibilité historique

Pour chaque événement, donne :
- verdict : l'un des 4 verdicts ci-dessus
- verdict_confidence : ta confiance dans ton verdict (0-100)
- correction_suggeree : si erreur probable, la date corrigée avec justification (null sinon)
- explication : courte explication de ton verdict (1-3 phrases)

Réponds UNIQUEMENT en JSON valide :
{
  "results": [
    {
      "code": "code_evenement",
      "verdict": "DATE_ORIGINALE_CORRECTE",
      "verdict_confidence": 90,
      "correction_suggeree": null,
      "explication": "La date originale est cohérente avec les sources historiques connues."
    }
  ]
}

ÉVÉNEMENTS À ARBITRER :
${eventsText}`;
}

function extractJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 60000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 5000 * attempt));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      return res;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

async function arbitrateWithRetry(events, retries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY manquante');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let delay = 3000;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(events) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        })
      }, 3, 60000);

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(extractJson(raw));
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
  console.log(`[${AGENT_NAME}] Arbitrage de ${events.length} cas rouges...`);

  const results = await arbitrateWithRetry(events);

  const codeToMeta = {};
  for (const e of events) {
    codeToMeta[e.code || e.id] = { id: e.id, code: e.code };
  }

  const enriched = results.map(r => ({
    ...r,
    evenement_id: codeToMeta[r.code]?.id || null
  }));

  fs.writeFileSync(STORAGE.output, JSON.stringify(enriched, null, 2));

  const erreurs = enriched.filter(r => r.verdict === 'ERREUR_GRAVE').length;
  const blindPlus = enriched.filter(r => r.verdict === 'BLIND_DATE_PLUS_PROBABLE').length;
  const incertains = enriched.filter(r => r.verdict === 'INCERTAIN').length;
  const corrects = enriched.filter(r => r.verdict === 'DATE_ORIGINALE_CORRECTE').length;

  console.log(`[${AGENT_NAME}] Terminé. ${corrects} corrects | ${blindPlus} blind+ | ${incertains} incertains | ${erreurs} erreurs graves`);

  logDecision(
    AGENT_NAME, 'ARBITRATE',
    { count: events.length },
    'SUCCESS',
    `Arbitré ${enriched.length} cas : ${erreurs} erreurs graves, ${blindPlus} blind date plus probable`,
    { erreurs, blindPlus, incertains, corrects }
  );
}

main().catch(err => {
  console.error(`[${AGENT_NAME}] Erreur fatale :`, err);
  process.exit(1);
});


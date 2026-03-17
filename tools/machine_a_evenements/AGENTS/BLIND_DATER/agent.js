import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_NAME = 'BLIND_DATER';

const STORAGE = {
  input: path.join(__dirname, 'STORAGE/INPUT/batch.json'),
  output: path.join(__dirname, 'STORAGE/OUTPUT/blind_dater_result.json'),
  logs: path.join(__dirname, 'STORAGE/LOGS')
};

// Retire tous les champs qui révèlent la date
function stripDate(event) {
  const { date, date_formatee, date_precision, ...rest } = event;
  return rest;
}

function buildPrompt(events) {
  const eventsText = events.map((e, i) => {
    const s = stripDate(e);
    return `Événement ${i + 1} (code: ${s.code || s.id}) :
- Titre: ${s.titre}
- Pays: ${(s.pays || []).join(', ') || 'non renseigné'}
- Région: ${s.region || 'non renseignée'}
- Époque: ${s.epoque || 'non renseignée'}
- Types: ${(s.types_evenement || []).join(', ') || 'non renseignés'}
- Mots-clés: ${(s.mots_cles || []).join(', ') || 'non renseignés'}
- Description: ${s.description_detaillee || 'non renseignée'}`;
  }).join('\n---\n');

  return `Tu es un historien expert. Pour chaque événement ci-dessous, estime QUAND il s'est produit, UNIQUEMENT à partir de son contexte — sans aucune date fournie.

Base-toi sur :
- L'époque indiquée (contexte large)
- Le titre, les types et les mots-clés
- Le contexte géographique
- La description détaillée
- Tes connaissances historiques

Pour chaque événement, donne :
- estimated_year : ton estimation (entier, année)
- year_min : borne basse raisonnable
- year_max : borne haute raisonnable
- confidence : ta confiance de 0 à 100
- reasoning : explication courte (1-2 phrases)

Si l'événement est très connu, sois précis. Si obscur, donne un intervalle large et confidence basse.

Réponds UNIQUEMENT en JSON valide :
{
  "results": [
    {
      "code": "code_evenement",
      "estimated_year": 1789,
      "year_min": 1787,
      "year_max": 1795,
      "confidence": 85,
      "reasoning": "La Révolution française est datée avec précision entre 1789 et 1799."
    }
  ]
}

ÉVÉNEMENTS À DATER :
${eventsText}`;
}

function extractJson(text) {
  // Retire les backticks markdown si présents (```json ... ```)
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

async function blindDateWithRetry(events, retries = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let delay = 2000;
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
  console.log(`[${AGENT_NAME}] Blind-dating de ${events.length} événements...`);

  const results = await blindDateWithRetry(events);

  const codeToMeta = {};
  for (const e of events) {
    codeToMeta[e.code || e.id] = { id: e.id, code: e.code };
  }

  const enriched = results.map(r => ({
    ...r,
    evenement_id: codeToMeta[r.code]?.id || null
  }));

  fs.writeFileSync(STORAGE.output, JSON.stringify(enriched, null, 2));

  const highConf = enriched.filter(r => r.confidence >= 70).length;
  console.log(`[${AGENT_NAME}] Terminé. ${enriched.length} datés, ${highConf} haute confiance`);

  logDecision(
    AGENT_NAME, 'BLIND_DATE',
    { count: events.length },
    'SUCCESS',
    `Blind-dated ${enriched.length} événements suspects`,
    { output: STORAGE.output, highConf }
  );
}

main().catch(err => {
  console.error(`[${AGENT_NAME}] Erreur fatale :`, err);
  process.exit(1);
});


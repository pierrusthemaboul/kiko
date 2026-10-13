// lib.mjs — helpers partagés pour les scripts d'évaluation IA (scoring événements)
// Usage : les scripts lisent MISTRAL_API_KEY (admin_web/.env ou env) + clé service Supabase.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: './admin_web/.env' });
dotenv.config();

// Providers supportés : 'mistral' (défaut) | 'openai' | 'gemini'. Override via AI_PROVIDER.
export const AI_PROVIDER = (process.env.AI_PROVIDER || 'mistral').toLowerCase();

const PROVIDERS = {
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    envKey: 'MISTRAL_API_KEY',
    model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    envKey: 'OPENAI_API_KEY',
    model: process.env.OPENAI_MODEL || 'gpt-4.1-nano',
  },
  gemini: {
    // Endpoint compatible OpenAI de Google AI Studio (clé gratuite, sans CB)
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    envKey: 'GEMINI_API_KEY',
    model: process.env.GEMINI_MODEL_SCORING || 'gemini-3.8-flash',
  },
};

const provider = PROVIDERS[AI_PROVIDER];
if (!provider) {
  console.error(`AI_PROVIDER inconnu: ${AI_PROVIDER} (attendu: mistral|openai)`);
  process.exit(1);
}
export const AI_MODEL = provider.model;

export const OUT_DIR = path.join(process.cwd(), 'scratch', 'ai_scoring');

export function supabaseClient() {
  const url = (process.env.VITE_SUPABASE_URL || '').includes('supabase.co')
    ? process.env.VITE_SUPABASE_URL
    : 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
  const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or service key in admin_web/.env');
    process.exit(1);
  }
  return createClient(url, key);
}

export function requireApiKey() {
  if (!process.env[provider.envKey]) {
    console.error(`Missing ${provider.envKey} (ajoute-la dans admin_web/.env ou en variable d'environnement)`);
    if (AI_PROVIDER === 'mistral') console.error('  → clé sur https://console.mistral.ai');
    if (AI_PROVIDER === 'gemini') console.error('  → clé gratuite sur https://aistudio.google.com');
    process.exit(1);
  }
}

export async function fetchAll(supabase, table, select) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < page) break;
  }
  return rows;
}

// PRNG déterministe (SEED env pour reproduire un échantillon)
export function makeRng(seed = Number(process.env.SEED) || Date.now()) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Throttle global : plan gratuit Mistral ≈ 1 req/s.
// MIN_INTERVAL_MS=0 pour désactiver (comptes payants).
const MIN_INTERVAL_MS = Number(process.env.MIN_INTERVAL_MS ?? 1100);
let lastCallStart = 0;
async function throttle() {
  const wait = Math.max(0, lastCallStart + MIN_INTERVAL_MS - Date.now());
  lastCallStart = Date.now() + wait;
  if (wait > 0) await sleep(wait);
}

// Appel chat (Mistral ou OpenAI — même shape) avec JSON mode + retries (429/5xx, Retry-After)
export async function aiJson(systemPrompt, userPrompt, { temperature = 0.2, maxRetries = 5 } = {}) {
  requireApiKey();
  const apiKey = process.env[provider.envKey];
  let attempt = 0;
  for (;;) {
    attempt++;
    await throttle();
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content ?? '{}';
      try {
        return { parsed: JSON.parse(text), usage: json.usage };
      } catch {
        return { parsed: null, raw: text, usage: json.usage };
      }
    }

    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt > maxRetries) {
      throw new Error(`${AI_PROVIDER} error ${res.status}: ${await res.text()}`);
    }
    const retryAfter = Number(res.headers.get('retry-after')) * 1000;
    const backoff = Math.max(retryAfter || 0, Math.min(20000, 1500 * 2 ** attempt)) + Math.random() * 500;
    await sleep(backoff);
  }
}

// Pool de concurrence simple
export async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function writeJsonl(filename, rows) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, filename);
  fs.writeFileSync(file, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  return file;
}

export const yearOf = (dateStr) => {
  const y = new Date(dateStr || '').getFullYear();
  return Number.isFinite(y) ? y : 2000;
};

// Même découpage que mobile_app (useEventSelector.getPeriod)
export function periodOf(dateStr) {
  const y = yearOf(dateStr);
  if (y < 500) return 'antiquite';
  if (y < 1500) return 'moyen_age';
  if (y < 1800) return 'renaissance';
  if (y < 1900) return 'xixe';
  if (y < 2000) return 'xxe';
  return 'xxie';
}

export const trunc = (s, n = 300) => {
  const t = String(s || '').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// ---------------------------------------------------------------------------
// PROMPTS partagés (eval + batch — ne pas diverger, sinon résultats non comparables)
// ---------------------------------------------------------------------------

export const NOTO_SYSTEM = `Tu es un expert en culture générale française.
Tu notes la notoriété d'événements historiques pour un joueur français moyen
(culture générale de base, PAS un historien) — celle d'un quiz chronologique mobile.
Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.`;

const NOTO_RUBRIC = `Barème de notoriété (0-100), jugé sur la capacité d'un joueur FR moyen
à situer l'événement dans le temps :
- 90-100 : tout le monde connaît (premier pas sur la Lune, chute du mur de Berlin)
- 70-89 : culture générale courante (bataille de Waterloo, peste noire)
- 40-69 : connu des personnes cultivées (paix de Westphalie, édit de Nantes)
- 10-39 : connu des amateurs d'histoire
- 0-9 : quasi inconnu du grand public`;

export const notoUserPrompt = (e) => `Événement : "${e.titre}" (${e.date_formatee || e.date})${e.description_detaillee ? ' — ' + trunc(e.description_detaillee) : ''}

${NOTO_RUBRIC}

Réponds en JSON : { "notoriety": <0-100>, "confidence": <0-100>, "reason": "<1 phrase max>" }`;

export const PAIR_SYSTEM = `Tu es un expert en culture générale française et en conception de quiz chronologiques.
Tu évalues des paires d'événements historiques pour un jeu mobile grand public francophone
(le joueur doit dire lequel des deux événements est arrivé en premier).
"Joueur français moyen" = culture générale de base, PAS un historien.
Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.`;

export const pairUserPrompt = (a, b) => `Événement A : "${a.titre}" (${a.date_formatee || a.date})${a.description_detaillee ? ' — ' + trunc(a.description_detaillee) : ''}
Événement B : "${b.titre}" (${b.date_formatee || b.date})${b.description_detaillee ? ' — ' + trunc(b.description_detaillee) : ''}

Réponds en JSON :
{
  "guessability": <0-100 : probabilité qu'un joueur FR moyen ordonne correctement>,
  "confusability": <0-100 : risque de confusion entre les deux événements>,
  "interest": <0-100 : la paire est-elle intéressante/instructive pour un quiz>,
  "known_a": <0-100 : notoriété de A en France>,
  "known_b": <0-100 : notoriété de B en France>,
  "confidence": <0-100 : ta confiance dans l'évaluation>,
  "reason": "<1 phrase max>"
}`;

// Charge un fichier de progression JSONL (resume) → Set des clés déjà traitées
export function loadProgress(file, keyFn) {
  const done = new Set();
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { done.add(keyFn(JSON.parse(line))); } catch { }
    }
  }
  return done;
}

export function appendJsonl(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(row) + '\n');
}

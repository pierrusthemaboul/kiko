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

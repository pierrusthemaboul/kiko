import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertEnv } from './utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export function getOpenAIClient() {
    assertEnv('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function embedText(text, options = {}) {
    const client = options.client || getOpenAIClient();
    const model = options.model || 'text-embedding-3-small';
    const input = String(text || '').trim();
    if (!input) throw new Error('embedText: texte vide');

    const res = await client.embeddings.create({
        model,
        input,
    });

    const vec = res?.data?.[0]?.embedding;
    if (!Array.isArray(vec)) throw new Error('embedText: embedding manquant');
    return vec;
}


import { embedText, getOpenAIClient } from './tempete/openai.mjs';
import { prodDb } from './tempete/supabase.mjs';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
async function test() {
    const text = "Pacte germano-soviétique";
    const vector = await embedText(text, { client: getOpenAIClient(), model: 'text-embedding-3-small' });

    const { data, error } = await prodDb.rpc('match_evenements_embeddings', {
        query_embedding: vector,
        match_count: 5,
    });
    console.log("Matches:", data);
}
test();


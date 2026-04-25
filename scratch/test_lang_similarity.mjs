import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testLang() {
    const t1 = "Sac de Constantinople";
    const t2 = "Sack of Constantinople";
    
    const res1 = await openai.embeddings.create({ model: "text-embedding-3-small", input: t1 });
    const res2 = await openai.embeddings.create({ model: "text-embedding-3-small", input: t2 });
    
    const emb1 = res1.data[0].embedding;
    const emb2 = res2.data[0].embedding;
    
    function dotProduct(a, b) { return a.reduce((sum, val, i) => sum + val * b[i], 0); }
    console.log(`Similarité FR/EN : ${dotProduct(emb1, emb2).toFixed(4)}`);
}
testLang();

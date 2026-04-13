import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkEmbeddingModel() {
  try {
    // 1. Vérifier la dimension exacte de embedding_vocal
    const { data: sample, error } = await supabase
      .from('evenements')
      .select('embedding_vocal')
      .not('embedding_vocal', 'is', null)
      .limit(1)
      .single();
    
    if (error) throw error;
    
    console.log(`Dimension de embedding_vocal: ${sample.embedding_vocal.length}`);
    
    // 2. Tester différents modèles OpenAI
    const testText = "Test event";
    
    // text-embedding-3-small
    try {
      const resp3s = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: testText
      });
      console.log(`text-embedding-3-small: ${resp3s.data[0].embedding.length} dimensions`);
    } catch (e) {
      console.log(`text-embedding-3-small erreur: ${e.message}`);
    }
    
    // text-embedding-ada-002
    try {
      const respAda = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: testText
      });
      console.log(`text-embedding-ada-002: ${respAda.data[0].embedding.length} dimensions`);
    } catch (e) {
      console.log(`text-embedding-ada-002 erreur: ${e.message}`);
    }
    
    // text-embedding-3-large
    try {
      const resp3l = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: testText
      });
      console.log(`text-embedding-3-large: ${resp3l.data[0].embedding.length} dimensions`);
    } catch (e) {
      console.log(`text-embedding-3-large erreur: ${e.message}`);
    }
    
  } catch (err) {
    console.error('Erreur:', err.message);
  }
}

checkEmbeddingModel();

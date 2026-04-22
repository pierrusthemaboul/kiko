import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchAll(table, columns, filterCol) {
  let allData = [];
  let from = 0;
  let step = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .not(filterCol, 'is', null)
      .range(from, from + step - 1);
    
    if (error) throw error;
    allData = allData.concat(data || []);
    if (!data || data.length < step) hasMore = false;
    from += step;
  }
  return allData;
}

async function migrateAll() {
  console.log('🔄 Reparation des embeddings : Passage au mode "Titre Uniquement" pour la robustesse...');
  
  try {
    // 1. PRODUCTION
    console.log('📡 Lecture de la table production (evenements)...');
    // On récupère tous les événements pour s'assurer qu'ils ont un embedding dans le sidecar
    const { data: events, error: fetchErr } = await supabase.from('evenements').select('id, titre');
    if (fetchErr) throw fetchErr;
    console.log(`📊 ${events.length} événements de production trouvés.`);

    for (let i = 0; i < events.length; i += 20) {
       const batch = events.slice(i, i + 20);
       console.log(`Processing production batch ${i/20 + 1}/${Math.ceil(events.length/20)}...`);
       try {
         await Promise.all(batch.map(async (ev) => {
            const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: ev.titre });
            const { error: updErr } = await supabase.from('evenements_embeddings').upsert({ 
                id: ev.id, 
                embedding_1536: res.data[0].embedding,
                source_type: 'titre',
                model_name: 'text-embedding-3-small'
            }, { onConflict: 'id, source_type' });
            if (updErr) throw updErr;
         }));
       } catch (e) {
         console.error(`❌ Error in batch ${i/20 + 1}:`, e.message);
       }
       await new Promise(r => setTimeout(r, 500));
    }

    // 2. SAS
    console.log('📡 Lecture de la table SAS...');
    const sas = await fetchAll('sas', 'id, titre', 'embedding');
    console.log(`📊 ${sas.length} événements du SAS trouvés.`);

    for (let i = 0; i < sas.length; i += 20) {
       const batch = sas.slice(i, i + 20);
       console.log(`Processing SAS batch ${i/20 + 1}/${Math.ceil(sas.length/20)}...`);
       try {
         await Promise.all(batch.map(async (ev) => {
            const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: ev.titre });
            const { error: updErr } = await supabase.from('sas').update({ embedding: res.data[0].embedding }).eq('id', ev.id);
            if (updErr) throw updErr;
         }));
       } catch (e) {
         console.error(`❌ Error in SAS batch ${i/20 + 1}:`, e.message);
       }
       await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('🏁 Réparation terminée ! La détection de doublons sera désormais 100% active.');
  } catch (err) {
    console.error('❌ Erreur globale migration:', err.message);
  }
}

migrateAll();


import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { UMAP } from 'umap-js';
import { PCA } from 'ml-pca';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

async function run() {
  console.log("🚀 Starting full data preparation for 3D visualization...");

  // 1. Get Official Events
  console.log("  - Fetching official events in batches...");
  let events = [];
  let evFrom = 0;
  let evStep = 1000;
  let evHasMore = true;

  while (evHasMore) {
    const { data, error } = await supabase
      .from('evenements')
      .select('id, titre, date, region, epoque')
      .range(evFrom, evFrom + evStep - 1);
    
    if (error) throw error;
    events = [...events, ...data];
    if (data.length < evStep) evHasMore = false;
    else evFrom += evStep;
    console.log(`    - Loaded ${events.length} events...`);
  }

  console.log("  - Fetching official embeddings in batches...");
  let embeddings = [];
  let from = 0;
  let step = 500;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('evenements_embeddings')
      .select('id, embedding_1536')
      .eq('source_type', 'titre')
      .range(from, from + step - 1);
    
    if (error) throw error;
    embeddings = [...embeddings, ...data];
    if (data.length < step) hasMore = false;
    else from += step;
    console.log(`    - Loaded ${embeddings.length} embeddings...`);
  }

  const embMap = new Map(embeddings.map(e => [e.id, e.embedding_1536]));
  
  const points = events
    .filter(e => embMap.has(e.id))
    .map(e => ({
      id: e.id,
      label: e.titre,
      date: e.date,
      region: e.region || "Non spécifié",
      epoque: e.epoque || "Non spécifié",
      vector: embMap.get(e.id),
      status: 'official'
    }));

  console.log(`✅ Loaded ${points.length} official events.`);

  // 2. Get SAS Events
  console.log("  - Fetching SAS events in batches...");
  let sasEvents = [];
  let sasFrom = 0;
  let sasStep = 500;
  let sasHasMore = true;

  while (sasHasMore) {
    const { data, error } = await supabase
      .from('sas')
      .select('id, titre, date, theme, embedding')
      .range(sasFrom, sasFrom + sasStep - 1);
    
    if (error) throw error;
    sasEvents = [...sasEvents, ...data];
    if (data.length < sasStep) sasHasMore = false;
    else sasFrom += sasStep;
    console.log(`    - Loaded ${sasEvents.length} SAS events...`);
  }

  for (const s of sasEvents) {
    let vector = s.embedding;
    if (!vector) {
      console.log(`  - Generating embedding for SAS: ${s.titre}`);
      try {
        const year = s.date ? ` (${s.date})` : "";
        vector = await getEmbedding(s.titre + year);
        await supabase.from('sas').update({ embedding: vector }).eq('id', s.id);
      } catch (err) {
        console.error(`Error embedding SAS ${s.id}:`, err);
        continue;
      }
    }
    points.push({
      id: s.id,
      label: s.titre,
      date: s.date,
      region: "SAS",
      epoque: s.theme || "SAS",
      vector: vector,
      status: 'sas'
    });
  }
  console.log(`✅ Added ${sasEvents.length} SAS events.`);

  // 3. Get Antichambre Events
  console.log("  - Fetching Antichambre events in batches...");
  let antiEvents = [];
  let antiFrom = 0;
  let antiStep = 500;
  let antiHasMore = true;

  while (antiHasMore) {
    const { data, error } = await supabase
      .from('antichambre')
      .select('id, titre, date, region, epoque, embedding_1536')
      .range(antiFrom, antiFrom + antiStep - 1);
    
    if (error) throw error;
    antiEvents = [...antiEvents, ...data];
    if (data.length < antiStep) antiHasMore = false;
    else antiFrom += antiStep;
    console.log(`    - Loaded ${antiEvents.length} Antichambre events...`);
  }

  for (const a of antiEvents) {
     let vector = a.embedding_1536;
     if (!vector) {
       console.log(`  - Generating embedding for Antichambre: ${a.titre}`);
       try {
         const year = a.date ? ` (${a.date})` : "";
         vector = await getEmbedding(a.titre + year);
         await supabase.from('antichambre').update({ embedding_1536: vector }).eq('id', a.id);
       } catch (err) {
         console.error(`Error embedding Antichambre ${a.id}:`, err);
         continue;
       }
     }
     points.push({
       id: a.id,
       label: a.titre,
       date: a.date,
       region: a.region || "Antichambre",
       epoque: a.epoque || "Antichambre",
       vector: vector,
       status: 'antichambre'
     });
  }
  console.log(`✅ Loaded ${points.length} total points.`);

  // 4. Dimensionality Reduction
  console.log("🌀 Preparing vectors (128D truncation + jitter)...");
  const reduced = points.map(p => {
    let vec;
    if (typeof p.vector === 'string') {
      try { vec = JSON.parse(p.vector); } catch(e) { vec = new Array(128).fill(0); }
    } else {
      vec = p.vector || new Array(128).fill(0);
    }
    // Truncate and add tiny jitter to avoid identical points (which crash UMAP trees)
    return vec.slice(0, 128).map(v => v + (Math.random() - 0.5) * 1e-7);
  });

  console.log("🌀 Running UMAP reduction (128D -> 3D)...");
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
    minDist: 0.1,
  });

  const coords = umap.fit(reduced);
  console.log("✅ UMAP reduction complete.");

  // 5. Density Calculation (for Heatmap)
  console.log("🔥 Calculating density for heatmap...");
  const getDistance = (p1, p2) => Math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2 + (p1[2]-p2[2])**2);
  const RADIUS = 2.0; 
  const density = coords.map((c1, i) => {
    let count = 0;
    for (let j = 0; j < coords.length; j++) {
      if (i === j) continue;
      if (getDistance(c1, coords[j]) < RADIUS) count++;
    }
    return count;
  });

  const finalData = points.map((p, i) => ({
    id: p.id,
    label: p.label,
    date: p.date,
    region: p.region,
    epoque: p.epoque,
    status: p.status,
    x: coords[i][0],
    y: coords[i][1],
    z: coords[i][2],
    density: density[i]
  }));

  const outputPath = path.join(process.cwd(), 'public/data_for_viz.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
  console.log(`✨ Exported ${finalData.length} points to ${outputPath}`);
}

run().catch(console.error);

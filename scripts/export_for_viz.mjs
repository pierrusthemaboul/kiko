import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Erreur : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans le .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportData() {
  console.log("🚀 Début de l'exportation des données pour la visualisation...");

  let allData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('evenements_embeddings')
      .select(`
        embedding_1536,
        metadata->>text,
        evenements (
          id,
          region,
          epoque,
          date
        )
      `)
      .eq('source_type', 'titre')
      .not('embedding_1536', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("❌ Erreur lors de la requête :", error.message);
      return;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    console.log(`📡 Page ${page + 1} récupérée (${allData.length} au total)...`);
    page++;
    
    if (data.length < pageSize) break;
  }

  console.log(`📦 ${allData.length} entrées totales récupérées. Formatage en cours...`);

  const formattedData = allData.map(item => ({
    id: item.evenements?.id,
    label: item.text,
    vector: item.embedding_1536,
    region: item.evenements?.region || "Inconnue",
    epoque: item.evenements?.epoque || "Inconnue",
    date: item.evenements?.date
  }));

  const outputPath = path.join(process.cwd(), 'data_for_viz.json');
  fs.writeFileSync(outputPath, JSON.stringify(formattedData, null, 2));

  console.log(`✅ Export terminé ! Fichier sauvegardé sous : ${outputPath}`);
}

exportData();

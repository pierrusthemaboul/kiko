import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis la racine
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error("❌ Erreur : Variables d'environnement manquantes dans le .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function patchEmbeddings() {
  console.log("🔍 Recherche des événements sans embedding de type 'titre'...");

  // 1. Identifier les manquants avec pagination
  console.log("📡 Récupération de la liste complète des événements...");
  let allEvents = [];
  let page = 0;
  while (true) {
    const { data } = await supabase.from('evenements').select('id, titre, date').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    allEvents = allEvents.concat(data);
    page++;
  }

  console.log("📡 Récupération de la liste des embeddings existants...");
  let existingIds = new Set();
  page = 0;
  while (true) {
    const { data } = await supabase.from('evenements_embeddings').select('id').eq('source_type', 'titre').range(page * 1000, (page + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    data.forEach(e => existingIds.add(e.id));
    page++;
  }

  const eventsToProcess = allEvents.filter(e => !existingIds.has(e.id));

  console.log(`🎯 ${eventsToProcess.length} événements à traiter.`);

  if (eventsToProcess.length === 0) {
    console.log("✅ Tout est déjà à jour !");
    return;
  }

  for (const event of eventsToProcess) {
    try {
      // Extraire l'année proprement (gestion des dates négatives possible)
      let year = "";
      if (event.date) {
        const parts = event.date.split('-');
        // Si la date commence par '-', le premier élément est vide
        year = event.date.startsWith('-') ? `-${parts[1]}` : parts[0];
      }

      const textToEmbed = `${event.titre} (${year})`;
      console.log(`✨ Génération pour : "${textToEmbed}"...`);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: textToEmbed,
      });

      const embedding = response.data[0].embedding;

      const { error: insertError } = await supabase
        .from('evenements_embeddings')
        .upsert({
          id: event.id,
          source_type: 'titre',
          embedding_1536: embedding,
          model_name: 'text-embedding-3-small',
          metadata: {
            text: textToEmbed,
            source: 'surgical_patch',
            updated_at: new Date().toISOString()
          }
        });

      if (insertError) throw insertError;

    } catch (err) {
      console.error(`❌ Erreur sur l'événement ${event.id} :`, err.message);
    }
  }

  // Vérification finale
  const { count } = await supabase
    .from('evenements_embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'titre');

  console.log(`\n🏁 Terminé !`);
  console.log(`📊 Total embeddings 'titre' en base : ${count} / 3016`);
}

patchEmbeddings();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { calculateNotorietyFR } from '../../tools/flux_qpuc/agent_notaire.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Identifiants Supabase manquants dans .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 50; 
const DELAY_MS = 800; // Augmenté pour éviter le blocage par Wikipedia (Rate Limit)
const STATE_FILE = path.join(__dirname, 'retro_index_state.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runRetroIndexation() {
  console.log(`\n🚀 LANCEMENT DE LA RÉTRO-INDEXATION FORCEE 🚀\n`);
  
  // Charger l'état local pour ne pas tout recommencer en cas de coupure
  let processedIds = {};
  if (fs.existsSync(STATE_FILE)) {
      processedIds = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log(`📂 [REPRISE] ${Object.keys(processedIds).length} événements déjà traités dans une session précédente.`);
  }

  // On récupère TOUS les événements avec pagination (pour contourner la limite de 1000 de Supabase)
  let allEvents = [];
  let fetchHasMore = true;
  let offset = 0;
  const PAGE_SIZE = 1000;

  console.log(`📡 Téléchargement du dictionnaire des événements...`);
  while (fetchHasMore) {
    const { data: pageData, error: fetchError } = await supabase
      .from('evenements')
      .select('id, titre')
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      console.error("❌ Erreur de récupération :", fetchError.message);
      return;
    }

    if (pageData && pageData.length > 0) {
      allEvents = allEvents.concat(pageData);
      offset += PAGE_SIZE;
      if (pageData.length < PAGE_SIZE) {
        fetchHasMore = false;
      }
    } else {
      fetchHasMore = false;
    }
  }

  console.log(`✅ ${allEvents.length} événements téléchargés depuis la base.`);

  const eventsToProcess = allEvents.filter(evt => !processedIds[evt.id]);
  
  console.log(`📋 [AUDIT] ${eventsToProcess.length} événements restants à traiter sur ${allEvents.length}.\n`);

  if (eventsToProcess.length === 0) {
      console.log("✅ Tout est déjà indexé ! Fin du script.");
      return;
  }

  let processedCount = 0;

  for (const evt of eventsToProcess) {
    try {
      const score = await calculateNotorietyFR(evt.titre);
      if (score === 10) {
          // 10 est le score de repli en cas d'erreur. On attend un peu plus longtemps.
          await sleep(2000);
      }
      
      const { error: updateError } = await supabase
        .from('evenements')
        .update({ notoriete_fr: score })
        .eq('id', evt.id);

      if (updateError) {
         console.error(`   ❌ Erreur d'update pour "${evt.titre}":`, updateError.message);
      } else {
         processedCount++;
         processedIds[evt.id] = true;
         
         // Sauvegarder l'état tous les 10 événements
         if (processedCount % 10 === 0) {
             fs.writeFileSync(STATE_FILE, JSON.stringify(processedIds, null, 2));
             console.log(`   ⏳ Progression... ${processedCount} traités sur ${eventsToProcess.length}.`);
         }
      }
      
      await sleep(DELAY_MS);
    } catch (e) {
      console.error(`   ❌ Erreur inattendue pour "${evt.titre}":`, e.message);
    }
  }

  // Dernière sauvegarde
  fs.writeFileSync(STATE_FILE, JSON.stringify(processedIds, null, 2));
  console.log(`\n🏁 RÉTRO-INDEXATION TOTALEMENT TERMINÉE ! (${processedCount} événements mis à jour)`);
}

runRetroIndexation();

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { findEventsForTheme } from './agent_investigateur.mjs';
import { tripleVerification } from './agent_greffier.mjs';
import { checkDuplicates, generateEmbedding } from './agent_veilleur.mjs';
import { getThemesFromSeries } from './agent_thematique_flash.mjs';
import { syncArchiveWithGemini } from './agent_rag_manager.mjs';
import { calculateNotorietyFR } from './agent_notaire.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Chemin absolu vers l'archive à la racine du projet
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const ARCHIVE_PATH = path.join(PROJECT_ROOT, 'data', 'qpuc_archives.json');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌ [CRITIQUE] supabaseUrl est requis ! (Orchestrateur)");
} else if (!supabaseKey) {
  console.error("❌ [CRITIQUE] supabaseKey est manquante ! (Orchestrateur)");
} else {
  console.log(`🔗 [ORCHESTRATEUR] Connexion Supabase (URL: ${supabaseUrl.substring(0, 20)}..., Key: ${supabaseKey.substring(0, 10)}...)`);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function startFluxQpucSingleBatch({ targetCount = 5, mode = 'qpuc', theme = null, onEventFound, onProgress, abortSignal }) {
  const log = (msg) => { console.log(msg); if (onProgress) onProgress(msg); };
  
  log(`\n🚀 LANCEMENT DU FLUX QPUC (RAG + ARCHIVES)`);
  
  if (abortSignal?.aborted) return;

  // 1. Sync Archive
  await syncArchiveWithGemini();

  // 2. Pioche des thèmes (Séries Archives ou Manuel)
  let qpucThemes = [];
  if (mode === 'manual' && theme && theme.trim() !== '') {
     qpucThemes = [theme.trim()];
  } else {
     qpucThemes = await getThemesFromSeries();
  }
  
  if (!qpucThemes || qpucThemes.length === 0) {
     log("❌ Impossible de trouver des thèmes de base.");
     return;
  }

  let addedCount = 0;
  let consecutiveEmptyCycles = 0;

  while (addedCount < targetCount) {
    if (abortSignal?.aborted) {
        log("🛑 [STOP] Interruption détectée. Arrêt immédiat de l'orchestrateur.");
        return;
    }

    const currentTheme = qpucThemes[Math.floor(Math.random() * qpucThemes.length)];

    // Protection contre les boucles infinies sur des thèmes épuisés
    if (consecutiveEmptyCycles >= 5) {
        if (mode === 'manual') {
            log(`\n🚨 [ÉPUISÉ] J'ai fouillé tous les recoins de Wikipédia pour "${currentTheme}" et je ne trouve plus d'événements originaux validés.`);
            log(`🏁 Arrêt prématuré pour éviter de consommer tes crédits inutilement.`);
            return;
        } else {
            log(`\n🔄 Thème "${currentTheme}" semble épuisé. Je change de sujet...`);
            consecutiveEmptyCycles = 0;
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    log(`\n🎫 THÈME DU CYCLE : "${currentTheme}"`);

    if (abortSignal?.aborted) return;
    const candidates = await findEventsForTheme(currentTheme, 8);
    
    if (!candidates || candidates.length === 0) {
        consecutiveEmptyCycles++;
        continue;
    }

    // Chargement de la mémoire locale
    let localArchive = [];
    try {
        if (fs.existsSync(ARCHIVE_PATH)) {
            localArchive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8'));
        }
    } catch (e) { console.error("Erreur lecture archive locale:", e.message); }

    const archivedTitles = new Set(localArchive.map(a => (a.titre || "").toLowerCase().trim()));
    let addedInThisCycle = 0;

    for (const cand of candidates) {
        if (abortSignal?.aborted) return;
        if (addedCount >= targetCount) break;

       // 0. MÉMOIRE LOCALE
       if (archivedTitles.has(cand.titre.toLowerCase().trim())) {
           log(`   ⏭️  MÉMOIRE : "${cand.titre}" déjà traité. Skip.`);
           continue;
       }

        if (abortSignal?.aborted) return;
        log(`🔍 Analyse de "${cand.titre}" (${cand.year})...`);
        const { consensus, status, finalYear } = await tripleVerification(cand.titre, cand.year);

        if (!consensus || !finalYear || finalYear < 1) {
           log(`   ❌ SKIP : Non confirmé par l'audit.`);
           continue;
        }

       if (abortSignal?.aborted) return;
       const isoDate = `${finalYear.toString().padStart(4, '0')}-01-01`;
       
       // Le veilleur génère maintenant l'embedding et nous le renvoie pour économiser un appel API
       const { isDuplicate, embedding } = await checkDuplicates(cand.titre, cand.description, isoDate);

       if (isDuplicate) {
          log(`   ⏭️  PASSAGE : Doublon détecté.`);
          continue;
       }

       if (abortSignal?.aborted) return;
       const scoreNotoriete = await calculateNotorietyFR(cand.titre);

       log(`   💾 INSERTION SAS : "${cand.titre}" (${finalYear})`);
       
       const cleanWikidataId = (cand.wikidata_id && cand.wikidata_id !== "N/A" && cand.wikidata_id !== "") ? cand.wikidata_id : null;
       
        const eventData = {
           titre: cand.titre,
           date: isoDate,
           description: cand.description,
           wikidata_id: cleanWikidataId,
           theme: currentTheme,
           statut: 'A_HABILLER',
           embedding: embedding, // Réutilisation de l'embedding déjà calculé
           notoriete_fr: scoreNotoriete
        };

       const { error } = await supabase.from('sas').insert([eventData]);

       if (error) {
          log(`   ❌ Erreur Supabase: ${error.message}`);
       } else {
          addedCount++;
          addedInThisCycle++;
          consecutiveEmptyCycles = 0;
          if (onEventFound) onEventFound(eventData);
          log(`   ✨ (${addedCount}/${targetCount}) OK.`);
          
          try {
             const archive = fs.existsSync(ARCHIVE_PATH) ? JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf8')) : [];
             archive.push({
                theme: currentTheme,
                titre: eventData.titre,
                date: eventData.date,
                savedAt: new Date().toISOString()
             });
             fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
          } catch (archErr) {
             console.error("⚠️ Erreur archivage:", archErr.message);
          }
       }
    }

    if (addedInThisCycle === 0) {
        consecutiveEmptyCycles++;
    }

    // Petite pause pour laisser l'event loop respirer et traiter les requêtes de STOP
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  log(`🏁 FLUX TERMINÉ : ${addedCount} nouveaux événements.`);
}

export { startFluxQpucSingleBatch };

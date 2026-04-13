import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', 'admin_web', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 
const serviceKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey; 
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !serviceKey || !geminiApiKey || !openaiApiKey) {
    console.error("❌ Erreur : Variables d'environnement manquantes (Supabase, Gemini ou OpenAI)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const openai = new OpenAI({ apiKey: openaiApiKey });

const BATCH_SIZE = 50; 
const DELAY_MS = 200; // API très rapide, pas besoin d'attendre 2 secondes comme avec Wikipédia
const STATE_FILE = path.join(__dirname, 'retro_index_llm_state.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// === L'Agent Juge (Double IA) ===
async function checkNotoriety(titre) {
    const prompt = `Agis comme un historien expert de la culture générale francophone.
Évalue l'importance culturelle, historique ou mémorable de CET ÉVÉNEMENT SPÉCIFIQUE (pas du sujet général) du point de vue d'un citoyen européen francophone.
Titre : "${titre}"
Échelle :
100 = Événement mondial incontournable (ex: Fin WW2, 1er pas sur la lune, Armistice)
80 = Grand événement très connu (ex: Sortie de GTA 5, Coupe du monde 98)
50 = Fait marquant connu des amateurs du domaine ou fait divers historique franco-européen célèbre
30 = Anecdote intéressante mais de niche
10 = Détail infime

Note de 1 à 100 ? Réponds UNIQUEMENT par le nombre.`;

    try {
        const [geminiRes, openaiRes] = await Promise.all([
            geminiModel.generateContent(prompt),
            openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        ]);

        const geminiText = geminiRes.response.text().trim();
        const openaiText = openaiRes.choices[0].message.content.trim();

        const matchG = geminiText.match(/\d+/);
        const matchO = openaiText.match(/\d+/);
        
        const scoreG = matchG ? parseInt(matchG[0], 10) : 50;
        const scoreO = matchO ? parseInt(matchO[0], 10) : 50;
        
        return {
            score: Math.round((scoreG + scoreO) / 2),
            details: `G:${scoreG} | O:${scoreO}`
        };
    } catch (err) {
        console.error("Erreur durant la double vérification :", err.message);
        return { score: 50, details: "Erreur" };
    }
}

async function runRetroIndexationLLM() {
  console.log(`\n🚀 LANCEMENT DE LA RÉPARATION DE NOTORIÉTÉ (DOUBLE-LLM) 🚀\n`);
  
  // Charger l'état local pour reprise
  let processedIds = {};
  if (fs.existsSync(STATE_FILE)) {
      processedIds = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      console.log(`📂 [REPRISE] ${Object.keys(processedIds).length} événements déjà réparés dans une session précédente.`);
  }

  // Téléchargement des événements
  let allEvents = [];
  let fetchHasMore = true;
  let offset = 0;
  const PAGE_SIZE = 1000;

  console.log(`📡 Téléchargement du dictionnaire des événements à corriger...`);
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
  
  console.log(`📋 [AUDIT] ${eventsToProcess.length} événements nécessitent une réparation LLM sur ${allEvents.length}.\n`);

  if (eventsToProcess.length === 0) {
      console.log("✅ Tout est déjà réparé ! Fin du script.");
      return;
  }

  let processedCount = 0;

  for (const evt of eventsToProcess) {
    try {
      const result = await checkNotoriety(evt.titre);
      
      const { error: updateError } = await supabase
        .from('evenements')
        .update({ notoriete_fr: result.score })
        .eq('id', evt.id);

      if (updateError) {
         console.error(`   ❌ Erreur update (Score: ${result.score}) pour "${evt.titre}":`, updateError.message);
      } else {
         processedCount++;
         processedIds[evt.id] = true;
         console.log(`   ⚖️ [${result.details}] => ${result.score}/100 | Modifié avec succès : "${evt.titre}"`);
         
         if (processedCount % 10 === 0) {
             fs.writeFileSync(STATE_FILE, JSON.stringify(processedIds, null, 2));
         }
      }
      
      await sleep(DELAY_MS);
    } catch (e) {
      console.error(`   ❌ Erreur inattendue pour "${evt.titre}":`, e.message);
    }
  }

  fs.writeFileSync(STATE_FILE, JSON.stringify(processedIds, null, 2));
  console.log(`\n🏁 RÉPARATION TOTALEMENT TERMINÉE ! (${processedCount} événements corrigés avec l'IA)`);
}

runRetroIndexationLLM();

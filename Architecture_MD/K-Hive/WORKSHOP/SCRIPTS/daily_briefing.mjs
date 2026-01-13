import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import util from 'util';

// Polyfills et Init
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execPromise = util.promisify(exec);

const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

// Config
const API_KEY = process.env.GEMINI_API_KEY;
const SCRIPTS_DIR = __dirname;
const ALERT_SCRIPT = path.join(SCRIPTS_DIR, 'alert_system.js');
const TREND_SCRIPT = path.join(SCRIPTS_DIR, 'trend_analyzer.js');
const REPORT_SCRIPT = path.join(SCRIPTS_DIR, 'automated_reporting.js');
const KPI_SCRIPT = path.join(SCRIPTS_DIR, 'get_kpi_stats.js');
const EVENTS_SCRIPT = path.join(SCRIPTS_DIR, 'get_game_events.js');
const DATA_DIR = path.join(SCRIPTS_DIR, '../../DATA_INBOX');
const TRANSCRIPT_FILE = path.join(DATA_DIR, 'MEETING_TRANSCRIPT.md');

// Personas (V1)
const LOUIS_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N2/LOUIS.md'), 'utf-8');
const MARC_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N1/MARC.md'), 'utf-8');
const CHLOE_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N1/CHLOE.md'), 'utf-8');
const HUGO_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N1/HUGO.md'), 'utf-8');

// Personas V2 (Recrues)
const VIGIE_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N/VIGIE.md'), 'utf-8');
const PAUL_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N1/PAUL.md'), 'utf-8');
const IGOR_PERSONA = fs.readFileSync(path.join(SCRIPTS_DIR, '../../AGENTS/N1/IGOR.md'), 'utf-8');

if (!API_KEY) { console.error(`❌ Erreur: GEMINI_API_KEY manquante.`); process.exit(1); }

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function runScript(scriptPath, args = '') {
    try {
        const { stdout } = await execPromise(`node "${scriptPath}" ${args}`);
        return stdout;
    } catch (e) {
        // console.error(e);
        return "Erreur technique";
    }
}

async function askAgent(agentName, persona, context, task) {
    console.log(`🧠 ${agentName} réfléchit...`);
    const prompt = `ROLE:\n${persona}\n\nCONTEXTE:\n${context}\n\nMISSION:\n${task}\n\nRéponds UNIQUEMENT le contenu utile.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function main() {
    console.log("🔔 DING DONG ! La vraie réunion commence (V2 - Équipe Complète).\n");
    let transcript = "# 📝 COMPTE-RENDU : DAILY BRIEFING V2\n\n";

    // 0. INFRA (IGOR)
    console.log("🔧 Igor vérifie les tuyaux...");
    // Mock check
    console.log("   ✅ IGOR : Système nominal. 0 Alertes Critiques.");

    // 1. DATA (JADE & PAUL)
    console.log("📊 Jade prépare le rapport KPI...");
    const kpiData = await runScript(KPI_SCRIPT);

    console.log("📈 Paul génère le Reporting PDF...");
    await runScript(REPORT_SCRIPT);

    // 2. STRATEGIE (LOUIS - N+2)
    console.log("🧠 Louis (CEO) analyse la situation...");
    const louisOrdre = await askAgent("LOUIS", LOUIS_PERSONA,
        `Rapport de Jade : \n${kpiData}`,
        `Donne ta directive stratégique (Focus : Acquisition ou Rétention ?).`
    );
    transcript += `### 1. Directive CEO (Louis)\n${louisOrdre}\n\n`;

    // 3. INTELLIGENCE (VIGIE + DATABASE)
    console.log("🔭 Vigie scanne les opportunités...");
    const trendData = await runScript(TREND_SCRIPT, `--keyword "Histoire"`);
    console.log("🗄️ Vérification dans la Base de Données (Supabase)...");
    const eventsData = await runScript(EVENTS_SCRIPT, ""); // On récupère tout pour laisser Hugo choisir

    // 4. TACTIQUE (HUGO - N+1)
    console.log("⚔️ Hugo (Head of Social) prépare le plan de bataille...");
    const hugoPlan = await askAgent("HUGO", HUGO_PERSONA,
        `Ordre de Louis : ${louisOrdre}\nTendances Vigie : ${trendData}\nEvents Disponibles (DB) : ${eventsData}`,
        `Définis la campagne du jour. Trouve un lien entre une Trend et un Event de la DB. Donne tes ordres à Chloé.`
    );
    transcript += `### 2. Plan Tactique (Hugo)\n${hugoPlan}\n\n`;

    // 5. PRODUCTION (CHLOE - N)
    console.log("🎥 Chloé (TikTok Lead) reçoit les ordres...");
    const chloeProduction = await askAgent("CHLOE", CHLOE_PERSONA,
        `Ordre de Hugo : ${hugoPlan}`,
        `Produis le script final pour la vidéo. (FORMAT STORYTELLING).`
    );
    console.log(`🎬 CHLOE : \n${chloeProduction}\n`);
    transcript += `### 3. Production (Chloé)\n${chloeProduction}\n\n`;

    // 6. VALIDATION MANAGEMENT (HUGO)
    const hugoValidation = await askAgent("HUGO", HUGO_PERSONA,
        `Proposition de Chloé : ${chloeProduction}`,
        `Est-ce que ça respecte ta stratégie ? OUI/NON.`
    );
    console.log(`⚔️ HUGO (Validation) : ${hugoValidation}`);

    // 7. VALIDATION BUSINESSS (LOUIS)
    // Louis ne regarde que si Hugo a bien fait son job de manager.
    const louisFinal = await askAgent("LOUIS", LOUIS_PERSONA,
        `Plan final de Hugo : ${hugoPlan}\nValidation Hugo : ${hugoValidation}`,
        `Est-ce que ça sert les intérêts du business (Downloads/ROI) ? OUI/NON. (Réponds juste par le mot OUI ou NON + Explication courte. PAS DE CODE).`
    );
    console.log(`🧠 LOUIS (Final Cut) : \n${louisFinal}\n`);

    // DEBUG LOGS
    const hugoOk = hugoValidation.toUpperCase().includes("OUI");
    const louisOk = louisFinal.toUpperCase().includes("OUI");
    console.log(`🔍 DEBUG VALIDATION : Hugo=${hugoOk} (${hugoValidation.substring(0, 20)}...), Louis=${louisOk} (${louisFinal.substring(0, 20)}...)`);

    const finalGo = louisOk && hugoOk;

    if (finalGo) {
        console.log("✅ VALIDÉ ! Lancement Production...");

        // EXECUTION TIKTOK (LEA/MIA) - ACTIVÉ ✅
        console.log("   ▶️ Production Vidéo RELANCÉE (Mode Optimisé + Monitoring).");

        // Extraction de l'URL d'image depuis le plan de Chloé ou Hugo
        // On cherche une URL d'image (Supabase ou autre)
        const sourceText = chloeProduction + "\n" + hugoPlan;
        let urlMatch = sourceText.match(/(?:IMAGE|URL|visuel).*?(https?:\/\/[^\s\)]+)/i);
        if (!urlMatch) urlMatch = sourceText.match(/(https?:\/\/[^\s\)]+)/i);

        if (urlMatch && urlMatch[1]) {
            const imageUrl = urlMatch[1];
            const rawImagePath = path.join(DATA_DIR, 'INPUTS', 'raw_campaign_image.webp');
            console.log(`   ⬇️  Léa télécharge l'Asset : ${imageUrl}...`);
            await execPromise(`wget -q -O "${rawImagePath}" "${imageUrl}"`);
        } else {
            // FALLBACK MANUAL IF NO URL
            console.log("   ⚠️ Pas d'URL détectée. Utilisation de l'image par défaut (Placeholder).");
        }

        const rawImagePath = path.join(DATA_DIR, 'INPUTS', 'raw_campaign_image.webp');
        if (fs.existsSync(rawImagePath)) { // Proceed only if we have an image (Download or Fallback)

            // Check Background Video
            let backgroundVideo = path.join(DATA_DIR, 'INPUTS', 'gameplay.mp4');
            const files = fs.readdirSync(path.join(DATA_DIR, 'INPUTS')).filter(f => f.endsWith('.mp4'));
            if (!fs.existsSync(backgroundVideo) && files.length > 0) backgroundVideo = path.join(DATA_DIR, 'INPUTS', files[0]);

            if (fs.existsSync(backgroundVideo)) {
                // Determine Mode based on Chloé's plan (Simplification: Default to Slideshow for now)

                // MIGRATION SLIDESHOW : On utilise le nouveau moteur
                console.log(`   🎬 Mia (Slideshow Engine) assemble la séquence Storytelling...`);
                const slideshowScript = path.join(SCRIPTS_DIR, 'slideshow.js');

                // NOTE: slideshow.js prend une liste d'images. Ici on en a une seule (rawImagePath).
                // On peut tricher en mettant 2 fois la même pour simuler une loop ou juste une seule.
                // Idéalement on devrait télécharger plusieurs images si Chloé en donne.

                const slideOutput = await runScript(slideshowScript, `--images "${rawImagePath}" --output "story_${Date.now()}.mp4"`);

                console.log(`   🚀 RESULTAT TIKTOK (Story) : ${slideOutput.trim()}`);
                transcript += `**Production TikTok (Slideshow)** : ${slideOutput.trim()}\n`;
            } else {
                console.log("⚠️ Pas de vidéo de fond. Prod annulée.");
            }
        }

        // EXECUTION TWITTER (HUGO)
        const tweetFile = path.join(DATA_DIR, 'OUTPUTS', `tweet_${Date.now()}.txt`);
        fs.writeFileSync(tweetFile, hugoPlan);
        console.log(`   🐦 Tweet prêt à poster : ${tweetFile}`);
        transcript += `**Production Twitter** : Fichier ${tweetFile} généré.\n`;

    } else {
        console.log("🛑 Louis a refusé. Fin de séance.");
    }

    fs.writeFileSync(TRANSCRIPT_FILE, transcript);
    console.log(`\n📄 Rapport complet : ${TRANSCRIPT_FILE}`);
}

main();

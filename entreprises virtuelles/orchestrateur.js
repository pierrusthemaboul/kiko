#!/usr/bin/env node
/**
 * ORCHESTRATEUR K-HIVE v2.0
 *
 * Pipeline de production automatisé avec hiérarchie:
 * LOUIS (CEO) → HUGO (Head of Social) → Équipes (TikTok, Twitter)
 *
 * Modes:
 *   --full     : Pipeline complet (capture + production)
 *   --tiktok   : Production TikTok uniquement (sans capture)
 *   --twitter  : Production Twitter uniquement
 *   --report   : Rapport CEO uniquement
 *   --clean    : Nettoyer tous les dossiers
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const BASE_DIR = __dirname;
const REPORTERS_DIR = path.join(BASE_DIR, 'REPORTERS_UNIT/AGENTS');
const KHIVE_DIR = path.join(BASE_DIR, 'K_HIVE/AGENTS');

// ============ UTILITAIRES ============
function cleanDir(dirPath, keepDir = true) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(f => {
            const p = path.join(dirPath, f);
            if (fs.lstatSync(p).isDirectory()) cleanDir(p, false);
            else fs.unlinkSync(p);
        });
        if (!keepDir) fs.rmdirSync(dirPath);
    } else if (keepDir) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function runAgent(agentPath, description = '') {
    return new Promise((resolve) => {
        const agentName = path.basename(path.dirname(agentPath));
        console.log(`\n▶️ ${description || `Lancement de ${agentName}`}`);
        console.log(`   ${agentPath}\n`);

        const envPath = path.join(BASE_DIR, '.env');
        const nodeArgs = fs.existsSync(envPath) ? ['--env-file', envPath, 'agent.js'] : ['agent.js'];

        const child = spawn('node', nodeArgs, {
            cwd: path.dirname(agentPath),
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n✅ ${agentName} terminé avec succès`);
            } else {
                console.log(`\n❌ ${agentName} a échoué (code ${code})`);
            }
            resolve(code === 0);
        });

        child.on('error', (err) => {
            console.log(`\n❌ Erreur: ${err.message}`);
            resolve(false);
        });
    });
}

async function askValidation(message) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`\n❓ ${message} [O/n] : `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() !== 'n');
        });
    });
}

function copyFiles(srcDir, destDir, pattern = '*') {
    if (!fs.existsSync(srcDir)) return 0;
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => {
        if (pattern === '*') return true;
        if (pattern.startsWith('*.')) return f.endsWith(pattern.substring(1));
        return f.includes(pattern);
    });

    files.forEach(f => fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f)));
    return files.length;
}

// ============ NETTOYAGE ============
function cleanAllStorages() {
    console.log("🧹 Nettoyage des dossiers de travail...\n");

    const dirs = [
        // Reporters
        path.join(REPORTERS_DIR, 'TOM/STORAGE/OUTPUT'),
        path.join(REPORTERS_DIR, 'DERUSH/STORAGE/INPUT'),
        path.join(REPORTERS_DIR, 'DERUSH/STORAGE/OUTPUT'),
        // K-Hive Production
        path.join(KHIVE_DIR, 'MARC/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'MARC/STORAGE/OUTPUT'),
        path.join(KHIVE_DIR, 'CHLOE/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'CHLOE/STORAGE/OUTPUT'),
        path.join(KHIVE_DIR, 'LEA/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'LEA/STORAGE/REJECTED'),
        // K-Hive Management
        path.join(KHIVE_DIR, 'HUGO/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'HUGO/STORAGE/OUTPUT'),
        path.join(KHIVE_DIR, 'JEAN/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'JEAN/STORAGE/OUTPUT'),
        path.join(KHIVE_DIR, 'LOUIS/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'LOUIS/STORAGE/OUTPUT'),
    ];

    dirs.forEach(dir => {
        cleanDir(dir);
        console.log(`   ✓ ${path.relative(BASE_DIR, dir)}`);
    });

    console.log("\n✅ Nettoyage terminé");
}

// ============ PIPELINES ============

// Pipeline REPORTERS: TOM → DERUSH
async function runReportersPipeline() {
    console.log("\n" + "═".repeat(50));
    console.log("  📹 PIPELINE REPORTERS (Capture & Découpage)");
    console.log("═".repeat(50));

    // TOM: Capture
    if (!await runAgent(path.join(REPORTERS_DIR, 'TOM/agent.js'), "TOM - Capture de session")) {
        return false;
    }

    if (!await askValidation("La session de capture vous convient-elle ?")) {
        console.log("⏸️ Pipeline interrompu par l'utilisateur");
        return false;
    }

    // TOM → DERUSH
    console.log("\n🚚 Transmission TOM → DERUSH...");
    const copied = copyFiles(
        path.join(REPORTERS_DIR, 'TOM/STORAGE/OUTPUT'),
        path.join(REPORTERS_DIR, 'DERUSH/STORAGE/INPUT')
    );
    console.log(`   ${copied} fichier(s) transférés`);

    // DERUSH: Découpage
    if (!await runAgent(path.join(REPORTERS_DIR, 'DERUSH/agent.js'), "DERUSH - Découpage clips")) {
        return false;
    }

    return true;
}

// Pipeline K-HIVE TIKTOK: MARC → CHLOE → LEA
async function runTikTokPipeline(fromReporters = true) {
    console.log("\n" + "═".repeat(50));
    console.log("  🎬 PIPELINE TIKTOK (Sélection → Production → QA)");
    console.log("═".repeat(50));

    // Si on vient des reporters, transférer les fichiers
    if (fromReporters) {
        console.log("\n🚚 Livraison DERUSH → MARC...");
        const copied = copyFiles(
            path.join(REPORTERS_DIR, 'DERUSH/STORAGE/OUTPUT'),
            path.join(KHIVE_DIR, 'MARC/STORAGE/INPUT')
        );
        console.log(`   ${copied} fichier(s) transférés`);
    }

    // MARC: Sélection stratégique
    if (!await runAgent(path.join(KHIVE_DIR, 'MARC/agent.js'), "MARC - Sélection & Hooks")) {
        return false;
    }

    // MARC → CHLOE (sélection + clips)
    console.log("\n🚚 Transmission MARC → CHLOE...");
    copyFiles(
        path.join(KHIVE_DIR, 'MARC/STORAGE/OUTPUT'),
        path.join(KHIVE_DIR, 'CHLOE/STORAGE/INPUT')
    );
    copyFiles(
        path.join(KHIVE_DIR, 'MARC/STORAGE/INPUT'),
        path.join(KHIVE_DIR, 'CHLOE/STORAGE/INPUT'),
        '*.mp4'
    );

    // CHLOE: Production vidéo avec hooks
    if (!await runAgent(path.join(KHIVE_DIR, 'CHLOE/agent.js'), "CHLOE - Production TikTok")) {
        return false;
    }

    // CHLOE → LEA
    console.log("\n🚚 Transmission CHLOE → LEA...");
    copyFiles(
        path.join(KHIVE_DIR, 'CHLOE/STORAGE/OUTPUT'),
        path.join(KHIVE_DIR, 'LEA/STORAGE/INPUT'),
        '*.mp4'
    );

    // LEA: Validation qualité
    if (!await runAgent(path.join(KHIVE_DIR, 'LEA/agent.js'), "LEA - Contrôle Qualité")) {
        return false;
    }

    return true;
}

// Pipeline TWITTER: JEAN
async function runTwitterPipeline(fromReporters = true) {
    console.log("\n" + "═".repeat(50));
    console.log("  🐦 PIPELINE TWITTER");
    console.log("═".repeat(50));

    // Transférer les données pour JEAN
    if (fromReporters) {
        console.log("\n🚚 Préparation données pour JEAN...");

        // Option 1: Depuis la sélection MARC
        const marcOutput = path.join(KHIVE_DIR, 'MARC/STORAGE/OUTPUT');
        if (fs.existsSync(marcOutput) && fs.readdirSync(marcOutput).length > 0) {
            copyFiles(marcOutput, path.join(KHIVE_DIR, 'JEAN/STORAGE/INPUT'), 'selection_');
        }

        // Option 2: Depuis le manifest DERUSH
        const derushOutput = path.join(REPORTERS_DIR, 'DERUSH/STORAGE/OUTPUT');
        if (fs.existsSync(derushOutput)) {
            copyFiles(derushOutput, path.join(KHIVE_DIR, 'JEAN/STORAGE/INPUT'), 'MANIFEST');
        }
    }

    // JEAN: Production tweets
    if (!await runAgent(path.join(KHIVE_DIR, 'JEAN/agent.js'), "JEAN - Production Twitter")) {
        return false;
    }

    return true;
}

// Rapport CEO
async function runCEOReport() {
    console.log("\n" + "═".repeat(50));
    console.log("  👔 RAPPORT CEO");
    console.log("═".repeat(50));

    if (!await runAgent(path.join(KHIVE_DIR, 'LOUIS/agent.js'), "LOUIS - Rapport KPIs")) {
        return false;
    }

    return true;
}

// ============ MAIN ============
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--full';

    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║  ORCHESTRATEUR K-HIVE v2.0                         ║");
    console.log("║  Pipeline de Production Automatisé                 ║");
    console.log("╚════════════════════════════════════════════════════╝");
    console.log(`\n📋 Mode: ${mode}`);
    console.log(`📅 Date: ${new Date().toISOString()}`);

    switch (mode) {
        case '--clean':
            cleanAllStorages();
            break;

        case '--report':
            await runCEOReport();
            break;

        case '--twitter':
            await runTwitterPipeline(false);
            break;

        case '--tiktok':
            // Production TikTok sans nouvelle capture
            await runTikTokPipeline(false);
            break;

        case '--observer':
            // Lancer l'écouteur Reactotron en arrière-plan
            await runAgent(path.join(REPORTERS_DIR, 'OBSERVER/agent.js'), "OBSERVER - Écouteur Reactotron & Analytics");
            break;

        case '--full':
        default:
            // Pipeline complet
            cleanAllStorages();

            // Étape 1: Capture et découpage
            if (!await runReportersPipeline()) {
                console.log("\n❌ Pipeline REPORTERS échoué");
                break;
            }

            // Étape 2: Production TikTok
            if (!await runTikTokPipeline(true)) {
                console.log("\n❌ Pipeline TIKTOK échoué");
                break;
            }

            // Étape 3: Production Twitter
            await runTwitterPipeline(true);

            // Étape 4: Rapport CEO
            await runCEOReport();

            console.log("\n" + "═".repeat(50));
            console.log("  ✨ PIPELINE COMPLET TERMINÉ !");
            console.log("═".repeat(50));
            console.log("\n📁 Contenus prêts à publier:");
            console.log("   → TikTok: PRET_A_PUBLIER/TIKTOK/");
            console.log("   → Twitter: PRET_A_PUBLIER/TWITTER/");
            break;
    }
}

// Afficher l'aide si demandé
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
ORCHESTRATEUR K-HIVE v2.0

Usage: node orchestrateur.js [mode]

Modes:
  --full      Pipeline complet (défaut)
              Capture → Découpage → Sélection → Production → Validation → Rapport

  --tiktok    Production TikTok uniquement
              Utilise les clips existants dans MARC/INPUT

  --twitter   Production Twitter uniquement
              Utilise les données existantes

  --report    Rapport CEO uniquement
              Analyse les KPIs sans production

  --clean     Nettoyer les dossiers de travail
              Vide tous les STORAGE/INPUT et OUTPUT

  --observer  Lancer l'écouteur Reactotron en temps réel
              Capture les logs et erreurs (Analyse Gemini auto)

  --help      Afficher cette aide

Hiérarchie des agents:
  LOUIS (CEO)
    └── HUGO (Head of Social)
          ├── MARC (Sélection)
          ├── CHLOE (Production TikTok)
          ├── LEA (Validation)
          └── JEAN (Twitter)

Reporters:
  TOM (Capture) → DERUSH (Découpage)
`);
    process.exit(0);
}

main().catch(e => {
    console.error(`\n💥 Erreur fatale: ${e.message}`);
    process.exit(1);
});

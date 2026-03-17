#!/usr/bin/env node
/**
 * ORCHESTRATEUR K-HIVE v3.0 - Architecture en Unités
 *
 * Pipeline de production spécialisé par réseau social:
 * REPORTERS → UNIT_VERTICAL_VIDEO → UNIT_REALTIME_MICRO
 *
 * Modes:
 *   --full     : Pipeline complet (capture + toutes les unités)
 *   --tiktok   : Unité Vidéo Verticale uniquement
 *   --twitter  : Unité Twitter/X uniquement
 *   --clean    : Nettoyer tous les dossiers storage
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const BASE_DIR = __dirname;
const REPORTERS_DIR = path.join(BASE_DIR, 'REPORTERS_UNIT/AGENTS');
const UNITS_DIR = path.join(BASE_DIR, 'UNITS');

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

        const envPath = path.join(BASE_DIR, '../.env'); // .env est à la racine de kiko
        const nodeArgs = fs.existsSync(envPath) ? ['--env-file', envPath, 'agent.js'] : ['agent.js'];

        const child = spawn('node', nodeArgs, {
            cwd: path.dirname(agentPath),
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code === 0) console.log(`\n✅ ${agentName} terminé`);
            else console.log(`\n❌ ${agentName} échoué (code ${code})`);
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
    console.log("🧹 Nettoyage industriel des dossiers...\n");

    const dirs = [
        // Reporters
        path.join(REPORTERS_DIR, 'TOM/STORAGE/OUTPUT'),
        path.join(REPORTERS_DIR, 'DERUSH/STORAGE/INPUT'),
        path.join(REPORTERS_DIR, 'DERUSH/STORAGE/OUTPUT'),
        // Unité Vidéo Verticale
        path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/MARC_VIDEO/STORAGE/INPUT'),
        path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/MARC_VIDEO/STORAGE/OUTPUT'),
        path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/CHLOE/STORAGE/INPUT'),
        path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/CHLOE/STORAGE/OUTPUT'),
        path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/LEA/STORAGE/INPUT'),
        path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/LEA/STORAGE/REJECTED'),
        // Unité Realtime (Twitter)
        path.join(UNITS_DIR, 'UNIT_REALTIME_MICRO/MARC_TWITTER/STORAGE/INPUT'),
        path.join(UNITS_DIR, 'UNIT_REALTIME_MICRO/MARC_TWITTER/STORAGE/OUTPUT'),
        path.join(UNITS_DIR, 'UNIT_REALTIME_MICRO/JEAN/STORAGE/INPUT'),
        path.join(UNITS_DIR, 'UNIT_REALTIME_MICRO/JEAN/STORAGE/OUTPUT'),
    ];

    dirs.forEach(dir => {
        cleanDir(dir);
        console.log(`   ✓ ${path.relative(BASE_DIR, dir)}`);
    });
}

// ============ PIPELINES ============

async function runReporters() {
    console.log("\n" + "═".repeat(50) + "\n  📹 REPORTERS (Capture & Découpage)\n" + "═".repeat(50));
    if (!await runAgent(path.join(REPORTERS_DIR, 'TOM/agent.js'), "TOM - Capture")) return false;
    if (!await askValidation("Capture OK ?")) return false;

    copyFiles(path.join(REPORTERS_DIR, 'TOM/STORAGE/OUTPUT'), path.join(REPORTERS_DIR, 'DERUSH/STORAGE/INPUT'));
    return await runAgent(path.join(REPORTERS_DIR, 'DERUSH/agent.js'), "DERUSH - Découpage");
}

async function runUnitVertical() {
    console.log("\n" + "═".repeat(50) + "\n  🎬 UNIT: VERTICAL VIDEO (TikTok/Reels/Shorts)\n" + "═".repeat(50));

    // De DERUSH vers MARC_VIDEO
    copyFiles(path.join(REPORTERS_DIR, 'DERUSH/STORAGE/OUTPUT'), path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/MARC_VIDEO/STORAGE/INPUT'));

    if (!await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/MARC_VIDEO/agent.js'), "MARC - Stratégie Vidéo")) return false;

    // De MARC vers CHLOE
    copyFiles(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/MARC_VIDEO/STORAGE/OUTPUT'), path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/CHLOE/STORAGE/INPUT'));
    copyFiles(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/MARC_VIDEO/STORAGE/INPUT'), path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/CHLOE/STORAGE/INPUT'), '*.mp4');

    if (!await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/CHLOE/agent.js'), "CHLOE - Montage")) return false;

    if (!await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/LEA/agent.js'), "LEA - Qualité & Distribution")) return false;

    // Phase de Distribution spécialisée (Captioning)
    console.log("\nDistribution aux experts réseaux...");
    await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/EMMA_TIKTOK/agent.js'), "EMMA - Spécialiste TikTok");
    await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/ZOE_INSTAGRAM/agent.js'), "ZOE - Spécialiste Instagram");
    await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/SARAH_FACEBOOK/agent.js'), "SARAH - Spécialiste Facebook");
    await runAgent(path.join(UNITS_DIR, 'UNIT_VERTICAL_VIDEO/CLARA_YOUTUBE/agent.js'), "CLARA - Spécialiste YouTube");

    return true;
}

async function runUnitRealtime() {
    console.log("\n" + "═".repeat(50) + "\n  🐦 UNIT: REALTIME MICRO (Twitter/X)\n" + "═".repeat(50));

    // On peut utiliser la sélection MARC ou le manifest DERUSH
    copyFiles(path.join(REPORTERS_DIR, 'DERUSH/STORAGE/OUTPUT'), path.join(UNITS_DIR, 'UNIT_REALTIME_MICRO/JEAN/STORAGE/INPUT'), 'MANIFEST');

    return await runAgent(path.join(UNITS_DIR, 'UNIT_REALTIME_MICRO/JEAN/agent.js'), "JEAN - Plume Twitter");
}

// ============ MAIN ============
async function main() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--full';

    console.log(`\n🚀 ORCHESTRATEUR K-HIVE v3.0 | Mode: ${mode}\n`);

    switch (mode) {
        case '--clean':
            cleanAllStorages();
            break;
        case '--tiktok':
            await runUnitVertical();
            break;
        case '--twitter':
            await runUnitRealtime();
            break;
        case '--full':
        default:
            cleanAllStorages();
            if (await runReporters()) {
                await runUnitVertical();
                await runUnitRealtime();
            }
            break;
    }
    console.log("\n✨ Travail terminé. Vérifiez le dossier PRET_A_PUBLIER/ par date.\n");
}

main().catch(console.error);


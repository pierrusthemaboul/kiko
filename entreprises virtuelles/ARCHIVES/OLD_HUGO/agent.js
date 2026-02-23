#!/usr/bin/env node
/**
 * Agent HUGO - Head of Social
 *
 * Coordonne les équipes de production:
 * 1. Reçoit les directives du CEO (LOUIS)
 * 2. Orchestre les pipelines TikTok et Twitter
 * 3. Rapporte les résultats
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Chemins
const BASE_DIR = path.resolve(__dirname, '..');
const INPUT_DIR = path.resolve(__dirname, config.storage.input);
const OUTPUT_DIR = path.resolve(__dirname, config.storage.output);
const LOGS_DIR = path.resolve(__dirname, config.storage.logs);

// Créer les dossiers si nécessaire
[INPUT_DIR, OUTPUT_DIR, LOGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============ LOGGING ============
function log(action, status, detail, reason = "") {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: config.agent_name,
        role: config.role,
        action,
        status,
        detail,
        reason
    };

    const icon = status === 'OK' || status === 'SUCCESS' ? '✅' :
                 status === 'FAILED' ? '❌' :
                 status === 'PROCESS' ? '⏳' :
                 status === 'DELEGATED' ? '📤' : '📝';
    console.log(`[HUGO/Social] ${icon} ${action}: ${detail}`);

    const logFile = path.join(LOGS_DIR, `hugo_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    return entry;
}

// ============ EXÉCUTION AGENT ============
function runAgent(agentName) {
    return new Promise((resolve) => {
        const agentPath = path.join(BASE_DIR, agentName, 'agent.js');

        if (!fs.existsSync(agentPath)) {
            log("DELEGATE", "FAILED", `Agent ${agentName} introuvable`, agentPath);
            resolve({ success: false, agent: agentName, error: 'Agent not found' });
            return;
        }

        log("DELEGATE", "PROCESS", `Lancement de ${agentName}...`);

        const startTime = Date.now();
        const child = spawn('node', [agentPath], {
            cwd: path.join(BASE_DIR, agentName),
            stdio: 'pipe'
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
            // Afficher en temps réel avec indentation
            data.toString().split('\n').forEach(line => {
                if (line.trim()) console.log(`    ${line}`);
            });
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            if (code === 0) {
                log("DELEGATE", "SUCCESS", `${agentName} terminé (${duration}s)`);
                resolve({ success: true, agent: agentName, duration: parseFloat(duration) });
            } else {
                log("DELEGATE", "FAILED", `${agentName} échec code ${code}`, errorOutput.substring(0, 200));
                resolve({ success: false, agent: agentName, error: errorOutput, code });
            }
        });

        child.on('error', (err) => {
            log("DELEGATE", "FAILED", `${agentName} erreur: ${err.message}`);
            resolve({ success: false, agent: agentName, error: err.message });
        });
    });
}

// ============ COPIE FICHIERS ENTRE AGENTS ============
function copyFiles(fromAgent, toAgent, pattern) {
    const fromDir = path.join(BASE_DIR, fromAgent, 'STORAGE', 'OUTPUT');
    const toDir = path.join(BASE_DIR, toAgent, 'STORAGE', 'INPUT');

    if (!fs.existsSync(fromDir)) {
        log("TRANSFER", "FAILED", `Dossier source introuvable: ${fromAgent}/OUTPUT`);
        return 0;
    }

    if (!fs.existsSync(toDir)) {
        fs.mkdirSync(toDir, { recursive: true });
    }

    const files = fs.readdirSync(fromDir).filter(f => {
        if (pattern === '*') return true;
        if (pattern.startsWith('*.')) return f.endsWith(pattern.substring(1));
        return f.includes(pattern);
    });

    let copied = 0;
    for (const file of files) {
        const src = path.join(fromDir, file);
        const dest = path.join(toDir, file);
        fs.copyFileSync(src, dest);
        copied++;
    }

    if (copied > 0) {
        log("TRANSFER", "OK", `${copied} fichier(s) transférés: ${fromAgent} → ${toAgent}`);
    }

    return copied;
}

// ============ PIPELINE TIKTOK ============
async function runTikTokPipeline() {
    console.log(`\n[HUGO/Social] 🎬 Pipeline TikTok\n`);
    log("PIPELINE", "PROCESS", "Démarrage pipeline TikTok");

    const results = {
        pipeline: 'tiktok',
        agents: [],
        success: true
    };

    // MARC: Sélection
    const marcResult = await runAgent('MARC');
    results.agents.push(marcResult);

    if (!marcResult.success) {
        log("PIPELINE", "FAILED", "MARC a échoué - pipeline interrompu");
        results.success = false;
        return results;
    }

    // Transférer MARC → CHLOE
    copyFiles('MARC', 'CHLOE', '*');

    // CHLOE: Production
    const chloeResult = await runAgent('CHLOE');
    results.agents.push(chloeResult);

    if (!chloeResult.success) {
        log("PIPELINE", "FAILED", "CHLOE a échoué - pipeline interrompu");
        results.success = false;
        return results;
    }

    // Transférer CHLOE → LEA
    copyFiles('CHLOE', 'LEA', '*.mp4');

    // LEA: Validation
    const leaResult = await runAgent('LEA');
    results.agents.push(leaResult);

    if (!leaResult.success) {
        log("PIPELINE", "FAILED", "LEA a échoué");
        results.success = false;
        return results;
    }

    log("PIPELINE", "SUCCESS", "Pipeline TikTok terminé");
    return results;
}

// ============ PIPELINE TWITTER ============
async function runTwitterPipeline() {
    console.log(`\n[HUGO/Social] 🐦 Pipeline Twitter\n`);
    log("PIPELINE", "PROCESS", "Démarrage pipeline Twitter");

    const results = {
        pipeline: 'twitter',
        agents: [],
        success: true
    };

    // JEAN: Production tweets
    const jeanResult = await runAgent('JEAN');
    results.agents.push(jeanResult);

    if (!jeanResult.success) {
        log("PIPELINE", "FAILED", "JEAN a échoué");
        results.success = false;
        return results;
    }

    log("PIPELINE", "SUCCESS", "Pipeline Twitter terminé");
    return results;
}

// ============ LECTURE DIRECTIVES CEO ============
function readCEODirectives() {
    const louisOutputDir = path.join(BASE_DIR, 'LOUIS', 'STORAGE', 'OUTPUT');

    if (!fs.existsSync(louisOutputDir)) {
        return null;
    }

    const reports = fs.readdirSync(louisOutputDir)
        .filter(f => f.startsWith('ceo_report_'))
        .sort()
        .reverse();

    if (reports.length === 0) {
        return null;
    }

    const latestReport = JSON.parse(
        fs.readFileSync(path.join(louisOutputDir, reports[0]), 'utf8')
    );

    // Filtrer les directives pour HUGO
    const myDirectives = latestReport.directives.filter(d => d.to === 'HUGO');

    return {
        report_date: latestReport.report_date,
        status: latestReport.executive_summary.status,
        directives: myDirectives
    };
}

// ============ MAIN ============
async function run() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  HUGO - Head of Social v${config.version}        ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    log("INITIALIZATION", "OK", "Head of Social en service");

    // Vérifier les directives du CEO
    const ceoDirectives = readCEODirectives();

    if (ceoDirectives) {
        console.log(`[HUGO/Social] 📋 Directives CEO reçues (${ceoDirectives.status}):`);
        if (ceoDirectives.directives.length > 0) {
            ceoDirectives.directives.forEach(d => {
                console.log(`         → ${d.action}: ${d.detail}`);
            });
        } else {
            console.log(`         (Aucune directive spécifique)`);
        }
        log("DIRECTIVES", "OK", `${ceoDirectives.directives.length} directive(s) du CEO`);
    } else {
        console.log(`[HUGO/Social] 📋 Pas de rapport CEO - fonctionnement autonome`);
    }

    // Mode d'exécution basé sur les arguments
    const args = process.argv.slice(2);
    const mode = args[0] || 'all';

    const report = {
        execution_date: new Date().toISOString(),
        mode,
        pipelines: []
    };

    if (mode === 'all' || mode === 'tiktok') {
        const tiktokResults = await runTikTokPipeline();
        report.pipelines.push(tiktokResults);
    }

    if (mode === 'all' || mode === 'twitter') {
        const twitterResults = await runTwitterPipeline();
        report.pipelines.push(twitterResults);
    }

    // Sauvegarder le rapport
    const reportFilename = `social_report_${Date.now()}.json`;
    const reportPath = path.join(OUTPUT_DIR, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Résumé final
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Résumé                                ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    report.pipelines.forEach(p => {
        const icon = p.success ? '✅' : '❌';
        console.log(`[HUGO/Social] ${icon} ${p.pipeline.toUpperCase()}: ${p.agents.length} agent(s) exécutés`);
        p.agents.forEach(a => {
            const agentIcon = a.success ? '✓' : '✗';
            console.log(`         ${agentIcon} ${a.agent}${a.duration ? ` (${a.duration}s)` : ''}`);
        });
    });

    log("FINALIZATION", "SUCCESS", `${report.pipelines.length} pipeline(s) exécutés`);
    console.log(`\n[HUGO/Social] ✅ Coordination terminée.\n`);
}

run().catch(e => {
    log("ERROR", "FAILED", e.message);
    process.exit(1);
});

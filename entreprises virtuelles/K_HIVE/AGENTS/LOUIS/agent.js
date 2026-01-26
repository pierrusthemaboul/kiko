#!/usr/bin/env node
/**
 * Agent LOUIS - CEO de K-Hive
 *
 * Supervise l'entreprise et génère des rapports KPI:
 * 1. Collecte les métriques de tous les agents
 * 2. Compare aux objectifs
 * 3. Génère des directives stratégiques
 */

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Chemins
const BASE_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(__dirname, config.storage.output);
const LOGS_DIR = path.resolve(__dirname, config.storage.logs);
const PRET_A_PUBLIER = path.resolve(__dirname, '../../../PRET_A_PUBLIER');

// Créer les dossiers si nécessaire
[OUTPUT_DIR, LOGS_DIR].forEach(dir => {
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
                 status === 'WARNING' ? '⚠️' :
                 status === 'FAILED' ? '❌' :
                 status === 'ALERT' ? '🚨' : '📝';
    console.log(`[LOUIS/CEO] ${icon} ${action}: ${detail}`);

    const logFile = path.join(LOGS_DIR, `louis_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    return entry;
}

// ============ COLLECTE MÉTRIQUES ============
function collectMetrics() {
    const metrics = {
        date: new Date().toISOString().split('T')[0],
        platforms: {
            tiktok: { produced: 0, approved: 0, rejected: 0 },
            twitter: { produced: 0, approved: 0, rejected: 0 }
        },
        agents: {}
    };

    // Compter les vidéos TikTok prêtes à publier
    const tiktokDir = path.join(PRET_A_PUBLIER, 'TIKTOK');
    if (fs.existsSync(tiktokDir)) {
        const videos = fs.readdirSync(tiktokDir).filter(f => f.endsWith('.mp4'));
        metrics.platforms.tiktok.approved = videos.length;
    }

    // Compter les tweets prêts à publier
    const twitterDir = path.join(PRET_A_PUBLIER, 'TWITTER');
    if (fs.existsSync(twitterDir)) {
        const tweets = fs.readdirSync(twitterDir).filter(f => f.endsWith('.json'));
        metrics.platforms.twitter.approved = tweets.length;
    }

    // Analyser les logs de chaque agent
    const agents = ['MARC', 'CHLOE', 'LEA', 'HUGO', 'JEAN'];

    for (const agentName of agents) {
        const agentLogsDir = path.join(BASE_DIR, agentName, 'STORAGE', 'LOGS');

        if (fs.existsSync(agentLogsDir)) {
            const logs = fs.readdirSync(agentLogsDir)
                .filter(f => f.endsWith('.json'))
                .sort()
                .reverse();

            // Prendre les logs des dernières 24h
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            const recentLogs = logs.filter(logFile => {
                const timestamp = parseInt(logFile.match(/\d+/)?.[0] || '0');
                return timestamp > oneDayAgo;
            });

            metrics.agents[agentName] = {
                total_logs: logs.length,
                recent_logs_24h: recentLogs.length,
                status: recentLogs.length > 0 ? 'ACTIVE' : 'IDLE'
            };

            // Compter les rejets de LEA
            if (agentName === 'LEA') {
                const rejectedDir = path.join(BASE_DIR, 'LEA', 'STORAGE', 'REJECTED');
                if (fs.existsSync(rejectedDir)) {
                    metrics.platforms.tiktok.rejected = fs.readdirSync(rejectedDir)
                        .filter(f => f.endsWith('.mp4')).length;
                }
            }

            // Compter la production de CHLOE
            if (agentName === 'CHLOE') {
                const outputDir = path.join(BASE_DIR, 'CHLOE', 'STORAGE', 'OUTPUT');
                if (fs.existsSync(outputDir)) {
                    metrics.platforms.tiktok.produced = fs.readdirSync(outputDir)
                        .filter(f => f.endsWith('.mp4')).length;
                }
            }
        }
    }

    return metrics;
}

// ============ ANALYSE KPI ============
function analyzeKPIs(metrics) {
    const analysis = {
        status: 'GREEN',
        alerts: [],
        recommendations: []
    };

    // KPI 1: Nombre de vidéos par jour
    const totalApproved = metrics.platforms.tiktok.approved + metrics.platforms.twitter.approved;
    const targetDaily = config.kpis.target_videos_per_day;

    if (totalApproved < targetDaily) {
        analysis.alerts.push({
            type: 'PRODUCTION_LOW',
            message: `Production sous l'objectif: ${totalApproved}/${targetDaily} vidéos`,
            severity: totalApproved === 0 ? 'HIGH' : 'MEDIUM'
        });
        analysis.status = totalApproved === 0 ? 'RED' : 'YELLOW';
    }

    // KPI 2: Taux d'approbation
    const produced = metrics.platforms.tiktok.produced;
    const approved = metrics.platforms.tiktok.approved;
    const rejected = metrics.platforms.tiktok.rejected;

    if (produced > 0) {
        const approvalRate = approved / (approved + rejected);
        if (approvalRate < config.kpis.target_approval_rate) {
            analysis.alerts.push({
                type: 'QUALITY_LOW',
                message: `Taux d'approbation: ${(approvalRate * 100).toFixed(0)}% (objectif: ${config.kpis.target_approval_rate * 100}%)`,
                severity: 'MEDIUM'
            });
            if (analysis.status === 'GREEN') analysis.status = 'YELLOW';
        }
    }

    // KPI 3: Diversité des plateformes
    if (metrics.platforms.twitter.approved === 0 && metrics.platforms.tiktok.approved > 0) {
        analysis.recommendations.push({
            type: 'DIVERSIFY',
            message: 'Aucun contenu Twitter - diversifier la présence sociale'
        });
    }

    // KPI 4: Activité des agents
    const idleAgents = Object.entries(metrics.agents)
        .filter(([name, data]) => data.status === 'IDLE')
        .map(([name]) => name);

    if (idleAgents.length > 0) {
        analysis.recommendations.push({
            type: 'AGENT_IDLE',
            message: `Agents inactifs: ${idleAgents.join(', ')}`
        });
    }

    return analysis;
}

// ============ GÉNÉRATION RAPPORT ============
function generateReport(metrics, analysis) {
    const report = {
        report_date: new Date().toISOString(),
        generated_by: config.agent_name,
        role: config.role,

        executive_summary: {
            status: analysis.status,
            total_content_ready: metrics.platforms.tiktok.approved + metrics.platforms.twitter.approved,
            alerts_count: analysis.alerts.length
        },

        kpi_dashboard: {
            production: {
                target: config.kpis.target_videos_per_day,
                actual: metrics.platforms.tiktok.approved + metrics.platforms.twitter.approved,
                status: metrics.platforms.tiktok.approved >= config.kpis.target_videos_per_day ? 'ON_TARGET' : 'BELOW_TARGET'
            },
            quality: {
                produced: metrics.platforms.tiktok.produced,
                approved: metrics.platforms.tiktok.approved,
                rejected: metrics.platforms.tiktok.rejected,
                approval_rate: metrics.platforms.tiktok.produced > 0
                    ? ((metrics.platforms.tiktok.approved / (metrics.platforms.tiktok.approved + metrics.platforms.tiktok.rejected)) * 100).toFixed(1) + '%'
                    : 'N/A'
            }
        },

        platforms: metrics.platforms,
        agents_status: metrics.agents,

        alerts: analysis.alerts,
        recommendations: analysis.recommendations,

        directives: []
    };

    // Générer des directives basées sur l'analyse
    if (analysis.status === 'RED') {
        report.directives.push({
            priority: 'HIGH',
            to: 'HUGO',
            action: 'INCREASE_PRODUCTION',
            detail: 'Lancer une nouvelle session de production TikTok immédiatement'
        });
    }

    if (analysis.alerts.some(a => a.type === 'QUALITY_LOW')) {
        report.directives.push({
            priority: 'MEDIUM',
            to: 'CHLOE',
            action: 'REVIEW_QUALITY',
            detail: 'Vérifier les paramètres de production (durée, format)'
        });
    }

    if (analysis.recommendations.some(r => r.type === 'DIVERSIFY')) {
        report.directives.push({
            priority: 'MEDIUM',
            to: 'JEAN',
            action: 'ACTIVATE_TWITTER',
            detail: 'Produire du contenu Twitter pour diversifier'
        });
    }

    return report;
}

// ============ MAIN ============
async function run() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  LOUIS - CEO K-Hive v${config.version}           ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    log("INITIALIZATION", "OK", "CEO LOUIS en fonction");

    // Étape 1: Collecter les métriques
    console.log(`\n[LOUIS/CEO] 📊 Collecte des métriques...\n`);
    const metrics = collectMetrics();

    // Afficher les métriques
    console.log(`       TikTok:`);
    console.log(`         - Produites: ${metrics.platforms.tiktok.produced}`);
    console.log(`         - Approuvées: ${metrics.platforms.tiktok.approved}`);
    console.log(`         - Rejetées: ${metrics.platforms.tiktok.rejected}`);
    console.log(`       Twitter:`);
    console.log(`         - Approuvées: ${metrics.platforms.twitter.approved}`);

    log("METRICS", "OK", `Métriques collectées pour ${Object.keys(metrics.agents).length} agents`);

    // Étape 2: Analyser les KPIs
    console.log(`\n[LOUIS/CEO] 🎯 Analyse des KPIs...\n`);
    const analysis = analyzeKPIs(metrics);

    const statusIcon = analysis.status === 'GREEN' ? '🟢' :
                       analysis.status === 'YELLOW' ? '🟡' : '🔴';
    console.log(`       Status global: ${statusIcon} ${analysis.status}`);

    if (analysis.alerts.length > 0) {
        console.log(`\n       Alertes:`);
        analysis.alerts.forEach(alert => {
            const icon = alert.severity === 'HIGH' ? '🚨' : '⚠️';
            console.log(`         ${icon} ${alert.message}`);
        });
    }

    if (analysis.recommendations.length > 0) {
        console.log(`\n       Recommandations:`);
        analysis.recommendations.forEach(rec => {
            console.log(`         💡 ${rec.message}`);
        });
    }

    log("ANALYSIS", "OK", `Status: ${analysis.status}, ${analysis.alerts.length} alertes`);

    // Étape 3: Générer le rapport
    console.log(`\n[LOUIS/CEO] 📝 Génération du rapport...\n`);
    const report = generateReport(metrics, analysis);

    // Sauvegarder le rapport
    const reportFilename = `ceo_report_${Date.now()}.json`;
    const reportPath = path.join(OUTPUT_DIR, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    log("REPORT", "SUCCESS", `Rapport sauvegardé: ${reportFilename}`);

    // Résumé final
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Rapport CEO                           ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    console.log(`[LOUIS/CEO] ${statusIcon} Status: ${analysis.status}`);
    console.log(`[LOUIS/CEO] 📦 Contenu prêt: ${report.executive_summary.total_content_ready}`);
    console.log(`[LOUIS/CEO] 🎯 Objectif: ${config.kpis.target_videos_per_day}/jour`);

    if (report.directives.length > 0) {
        console.log(`\n[LOUIS/CEO] 📋 Directives émises:`);
        report.directives.forEach(d => {
            console.log(`         → ${d.to}: ${d.action} (${d.priority})`);
        });
    }

    console.log(`\n[LOUIS/CEO] ✅ Rapport terminé.\n`);
}

run().catch(e => {
    log("ERROR", "FAILED", e.message);
    process.exit(1);
});

#!/usr/bin/env node
/**
 * Agent LEA - Contrôle Qualité
 *
 * Valide les vidéos TikTok avant publication:
 * 1. Vérifie durée (10-60s)
 * 2. Vérifie taille fichier
 * 3. Déplace vers PRET_A_PUBLIER ou REJECTED
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Chemins
const INPUT_DIR = path.resolve(__dirname, config.storage.input);
const REJECTED_DIR = path.resolve(__dirname, config.storage.output_rejected);
const LOGS_DIR = path.resolve(__dirname, config.storage.logs);

// Destination pour les agents de distribution (EMMA, ZOE, SARAH, CLARA)
const DELIVERY_HUB = path.resolve(__dirname, '../STORAGE/DELIVERY_INPUT');

// Créer les dossiers si nécessaire
[INPUT_DIR, REJECTED_DIR, LOGS_DIR, DELIVERY_HUB].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============ LOGGING ============
function log(action, status, detail, reason = "") {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: config.agent_name,
        action,
        status,
        detail,
        reason
    };

    // Console
    const icon = status === 'APPROVED' ? '✅' :
        status === 'REJECTED' ? '❌' :
            status === 'OK' || status === 'SUCCESS' ? '✅' :
                status === 'FAILED' ? '❌' :
                    status === 'PROCESS' ? '⏳' : '📝';
    console.log(`[LEA] ${icon} ${action}: ${detail}`);

    // Fichier log
    const logFile = path.join(LOGS_DIR, `lea_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    return entry;
}

// ============ VALIDATION ============
function validateVideo(videoPath) {
    const filename = path.basename(videoPath);
    const issues = [];

    // 1. Vérifier la taille du fichier
    const stats = fs.statSync(videoPath);
    const sizeKB = stats.size / 1024;
    const sizeMB = sizeKB / 1024;

    if (sizeKB < config.validation.min_size_kb) {
        issues.push(`Taille trop petite: ${sizeKB.toFixed(0)}KB < ${config.validation.min_size_kb}KB (fichier corrompu?)`);
    }

    if (sizeMB > config.validation.max_size_mb) {
        issues.push(`Taille trop grande: ${sizeMB.toFixed(1)}MB > ${config.validation.max_size_mb}MB`);
    }

    // 2. Vérifier la durée avec ffprobe
    let duration = 0;
    try {
        const durationStr = execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
            { encoding: 'utf8' }
        ).trim();
        duration = parseFloat(durationStr);

        if (duration < config.validation.min_duration_seconds) {
            issues.push(`Durée trop courte: ${duration.toFixed(1)}s < ${config.validation.min_duration_seconds}s`);
        }

        if (duration > config.validation.max_duration_seconds) {
            issues.push(`Durée trop longue: ${duration.toFixed(1)}s > ${config.validation.max_duration_seconds}s`);
        }
    } catch (e) {
        issues.push(`Impossible de lire la durée: fichier corrompu?`);
    }

    // 3. Vérifier que c'est bien une vidéo valide
    try {
        execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
            { encoding: 'utf8' }
        );
    } catch (e) {
        issues.push(`Vidéo illisible ou corrompue`);
    }

    return {
        filename,
        path: videoPath,
        sizeKB,
        sizeMB,
        duration,
        issues,
        valid: issues.length === 0
    };
}

// ============ MAIN ============
async function run() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  LEA - Contrôle Qualité v${config.version}        ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    log("INITIALIZATION", "OK", "Agent LEA en service");

    // Scanner les vidéos à valider
    const videos = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.mp4'));

    if (videos.length === 0) {
        log("SCAN", "OK", "Aucune vidéo à valider", "Attente production CHLOE");
        return;
    }

    log("SCAN", "OK", `${videos.length} vidéo(s) à auditer`);

    const results = {
        approved: [],
        rejected: []
    };

    for (const video of videos) {
        const videoPath = path.join(INPUT_DIR, video);

        console.log(`\n[LEA] 🔍 Audit: ${video}`);

        const validation = validateVideo(videoPath);

        console.log(`       Taille: ${validation.sizeMB.toFixed(2)} MB`);
        console.log(`       Durée: ${validation.duration.toFixed(1)}s`);

        if (validation.valid) {
            // Approuvé - copier vers le HUB de distribution
            const destPath = path.join(DELIVERY_HUB, video);
            fs.copyFileSync(videoPath, destPath);

            // Copier aussi le rapport s'il existe (contient le hook)
            const reportName = video.replace('.mp4', '_RAPPORT.md');
            const reportPath = path.join(INPUT_DIR, reportName);
            if (fs.existsSync(reportPath)) {
                fs.copyFileSync(reportPath, path.join(DELIVERY_HUB, reportName));
            }

            fs.unlinkSync(videoPath); // Supprimer l'original
            // Supprimer le rapport original (reportName et reportPath déjà déclarés au-dessus)
            if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);

            log("AUDIT", "APPROVED", video, "Tous les critères respectés et envoyé au HUB");
            results.approved.push({
                filename: video,
                duration: validation.duration,
                sizeMB: validation.sizeMB
            });
        } else {
            // Rejeté - déplacer vers REJECTED
            const destPath = path.join(REJECTED_DIR, video);
            fs.copyFileSync(videoPath, destPath);
            fs.unlinkSync(videoPath);

            log("AUDIT", "REJECTED", video, validation.issues.join('; '));
            results.rejected.push({
                filename: video,
                issues: validation.issues
            });

            // Afficher les problèmes
            validation.issues.forEach(issue => {
                console.log(`       ⚠️ ${issue}`);
            });
        }
    }

    // Résumé final
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Résultat                              ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    console.log(`[LEA] ✅ Approuvées: ${results.approved.length}`);
    results.approved.forEach(v => {
        console.log(`       → ${v.filename} (${v.duration.toFixed(1)}s, ${v.sizeMB.toFixed(2)}MB)`);
    });

    if (results.rejected.length > 0) {
        console.log(`\n[LEA] ❌ Rejetées: ${results.rejected.length}`);
        results.rejected.forEach(v => {
            console.log(`       → ${v.filename}`);
            v.issues.forEach(i => console.log(`         - ${i}`));
        });
    }

    if (results.approved.length > 0) {
        console.log(`\n[LEA] 📁 Vidéos prêtes dans le HUB de distribution : ${DELIVERY_HUB}`);
    }

    log("FINALIZATION", "SUCCESS", `${results.approved.length} approuvées, ${results.rejected.length} rejetées`);

    console.log(`\n[LEA] ✅ Audit terminé.\n`);
}

run().catch(e => {
    log("ERROR", "FAILED", e.message);
    process.exit(1);
});

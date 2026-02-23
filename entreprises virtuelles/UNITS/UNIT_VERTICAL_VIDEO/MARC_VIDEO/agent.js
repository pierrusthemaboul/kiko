#!/usr/bin/env node
/**
 * Agent MARC - Stratège de Contenu
 *
 * Sélectionne les meilleurs clips basé sur:
 * 1. Notoriété de l'événement (VIP > 90)
 * 2. Durée du clip
 * 3. Génère des hooks adaptés au jeu (Avant ou Après?)
 */

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Charger les variables d'environnement
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const fetch = require('node-fetch');


// Chemins
const INPUT_DIR = path.resolve(__dirname, config.storage.input);
const OUTPUT_DIR = path.resolve(__dirname, config.storage.output);
const LOGS_DIR = path.resolve(__dirname, config.storage.logs);
const GAME_BIBLE_PATH = path.resolve(__dirname, '../../../SHARED/GAME_BIBLE.md');

// Charger la Bible du Jeu si elle existe
function getGameBible() {
    if (fs.existsSync(GAME_BIBLE_PATH)) {
        return fs.readFileSync(GAME_BIBLE_PATH, 'utf8');
    }
    return "Timalaus: Jeu de quiz historique Avant/Après.";
}

// Créer les dossiers si nécessaire
[INPUT_DIR, OUTPUT_DIR, LOGS_DIR].forEach(dir => {
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
    const icon = status === 'OK' || status === 'SUCCESS' ? '✅' :
        status === 'FAILED' ? '❌' :
            status === 'PROCESS' ? '⏳' : '📝';
    console.log(`[MARC] ${icon} ${action}: ${detail}`);

    // Fichier log
    const logFile = path.join(LOGS_DIR, `marc_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    return entry;
}

// ============ VALIDATION DE HOOK ============
function validateHook(hook) {
    if (!hook || hook.length < 10) return false;
    if (hook.length > 65) return false;
    if (hook.toLowerCase().includes('avant ou après')) return false; // Trop explicite pour le hook
    if (hook.toLowerCase().includes('timalaus')) return false; // Pas de pub directe
    return true;
}

// ============ GÉNÉRATION DE HOOK ============
async function generateHookWithAI(clip, maxRetries = 3) {
    const hookStyles = [
        "mystérieux et intrigant",
        "provocateur avec une question",
        "nostalgique et émotionnel",
        "humoristique et léger"
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        log("HOOK_AI", "FAILED", "GEMINI_API_KEY non définie. Fallback statique.");
        return generateHookStatic(clip);
    } else {
        console.log(`[MARC] 🔑 Clé API détectée (${apiKey.substring(0, 5)}...)`);
    }

    for (let i = 0; i < maxRetries; i++) {
        try {
            const style = hookStyles[Math.floor(Math.random() * hookStyles.length)];
            const bible = getGameBible();

            const prompt = `Tu es un créateur TikTok stratégique (MARC). Tu travailles pour le projet décrit dans cette BIBLE:

--- BIBLE DU JEU ---
${bible}
---

MISSION: Génère UN SEUL hook accrocheur (max 55 chars) pour cette vidéo sur l'événement historique:

Événement: ${clip.evenement.titre}
Date: ${clip.evenement.date}
Description: ${clip.evenement.description}

Le jeu demande "AVANT ou APRÈS?".
Le ton doit être ${style}.
Le hook doit:
- Être intrigant et refléter l'âme du jeu décrite dans la bible
- Ne PAS révéler la réponse ni la date exacte
- Donner envie de voir la suite ou de télécharger l'app
- NE PAS contenir le mot "Timalaus" ni l'expression "avant ou après"

Réponds UNIQUEMENT avec le hook, sans guillemets ni fioritures.`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                let hook = data.candidates[0].content.parts[0].text.trim().replace(/^"|"$/g, '');

                if (validateHook(hook)) {
                    log("HOOK_AI", "OK", `Style: ${style} -> "${hook}"`);
                    return hook;
                } else {
                    console.log(`[MARC] ⚠️ Hook invalidé (${hook.length}ch): "${hook}"`);
                }
            }
        } catch (error) {
            console.log(`[MARC] ⚠️ Tentative ${i + 1}/${maxRetries} échouée: ${error.message}`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    log("HOOK_AI", "FAILED", "Toutes les tentatives ont échoué. Fallback statique.");
    return generateHookStatic(clip);
}


function generateHookStatic(clip) {
    const year = clip.evenement.date.split('-')[0];
    const title = clip.evenement.titre.toLowerCase();

    if (title.includes('victoire') || title.includes('bataille') || title.includes('guerre')) {
        return `${year}. Cette bataille... avant ou après ?`;
    }
    if (title.includes('mort') || title.includes('décès') || title.includes('assassinat')) {
        return `${year}. Tu situes cette date ?`;
    }
    if (title.includes('france') || title.includes('français') || title.includes('paris')) {
        return `${year}. Un moment de l'Histoire de France.`;
    }
    if (title.includes('découverte') || title.includes('invention')) {
        return `${year}. Cette découverte... avant ou après ?`;
    }
    if (title.includes('traité') || title.includes('signature') || title.includes('accord')) {
        return `${year}. Ce traité historique...`;
    }

    const genericHooks = [
        `${year}. Avant ou après ? Tu saurais ?`,
        `${year}. Évident ou piège ?`,
        `${year}. T'aurais trouvé ?`,
        `${year}. Facile... ou pas ?`
    ];

    return genericHooks[clip.tour % genericHooks.length];
}

// ============ GÉNÉRATION NOM FICHIER LISIBLE ============
function generateReadableFilename(clip) {
    const year = clip.evenement.date.split('-')[0];

    // Extraire les mots clés du titre
    const subject = clip.evenement.titre
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Garder que alphanum
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 3) // Mots de plus de 3 lettres
        .slice(0, 3) // Max 3 mots
        .join('_');

    return `clip_${subject}_${year}.mp4`;
}

// ============ SÉLECTION INTELLIGENTE ============
async function selectClips(manifest) {
    log("ANALYZE", "PROCESS", `Analyse de ${manifest.clips.length} clips...`);

    // Filtrer les clips valides
    const validClips = manifest.clips.filter(clip => {
        // Doit avoir un choix (réponse du joueur)
        if (!clip.choix) {
            log("FILTER", "SKIP", `Tour ${clip.tour}: pas de réponse joueur`, "Clip ignoré");
            return false;
        }

        // Durée positive et suffisante
        if (clip.duration < config.selection.min_duration) {
            log("FILTER", "SKIP", `Tour ${clip.tour}: durée ${clip.duration.toFixed(1)}s < ${config.selection.min_duration}s`, "Trop court");
            return false;
        }

        return true;
    });

    log("FILTER", "OK", `${validClips.length} clips valides sur ${manifest.clips.length}`);

    // Classer par notoriété (décroissant)
    const ranked = [...validClips].sort((a, b) => {
        return (b.evenement.notoriete || 0) - (a.evenement.notoriete || 0);
    });

    // Afficher le classement
    console.log(`\n[MARC] 📊 Classement par notoriété:`);
    ranked.forEach((clip, i) => {
        const isVip = (clip.evenement.notoriete || 0) > config.selection.vip_threshold;
        const star = isVip ? '⭐' : '  ';
        console.log(`       ${i + 1}. ${star} [${clip.evenement.notoriete || '?'}] ${clip.evenement.titre.substring(0, 40)}...`);
    });

    // Sélectionner les VIP d'abord
    const vipClips = ranked.filter(c => (c.evenement.notoriete || 0) > config.selection.vip_threshold);

    let selected;
    let method;

    if (vipClips.length > 0) {
        selected = vipClips.slice(0, config.selection.max_clips);
        method = "VIP_PRIORITY";
        log("STRATEGY", "OK", `${selected.length} clips VIP sélectionnés (notoriété > ${config.selection.vip_threshold})`);
    } else {
        selected = ranked.slice(0, config.selection.fallback_top_n);
        method = "TOP_N_FALLBACK";
        log("STRATEGY", "OK", `Pas de VIP, top ${config.selection.fallback_top_n} sélectionnés`);
    }

    // Enrichir avec hooks et noms lisibles
    const enriched = [];
    for (const clip of selected) {
        const hook = await generateHookWithAI(clip);
        const readableFilename = generateReadableFilename(clip);

        log("HOOK", "OK", `"${hook}" pour ${clip.evenement.titre.substring(0, 30)}...`);

        enriched.push({
            original_filename: clip.filename,
            readable_filename: readableFilename,
            tour: clip.tour,
            duration: clip.duration,
            evenement: {
                titre: clip.evenement.titre,
                date: clip.evenement.date,
                notoriete: clip.evenement.notoriete,
                description: clip.evenement.description
            },
            choix: clip.choix,
            hook: hook,
            is_vip: (clip.evenement.notoriete || 0) > config.selection.vip_threshold
        });
    }

    return {
        session_id: manifest.session_id,
        selection_date: new Date().toISOString(),
        selection_method: method,
        total_clips_analyzed: manifest.clips.length,
        clips_selected: enriched.length,
        clips: enriched
    };
}

// ============ MAIN ============
async function run() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  MARC - Stratège de Contenu v${config.version}     ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    log("INITIALIZATION", "OK", "Agent MARC prêt");

    // Chercher le manifest
    const manifests = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('_DELIVERY_MANIFEST.json'));

    if (manifests.length === 0) {
        log("SCAN", "FAILED", "Aucun DELIVERY_MANIFEST trouvé dans INPUT", "Attente livraison DERUSH");
        return;
    }

    const latestManifest = manifests.sort().reverse()[0];
    log("SCAN", "OK", `Manifest trouvé: ${latestManifest}`);

    // Charger et analyser
    const manifestPath = path.join(INPUT_DIR, latestManifest);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    log("READ", "OK", `Session: ${manifest.session_id}, ${manifest.clips.length} clips`);

    // Sélectionner
    const selection = await selectClips(manifest);

    // Sauvegarder
    const outputFilename = `selection_${manifest.session_id}.json`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(selection, null, 2));

    // Résumé final
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Résultat                              ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    console.log(`[MARC] 📦 ${selection.clips_selected} clips sélectionnés (${selection.selection_method})\n`);

    selection.clips.forEach((clip, i) => {
        console.log(`       ${i + 1}. ${clip.is_vip ? '⭐' : '  '} ${clip.evenement.titre.substring(0, 35)}...`);
        console.log(`          Hook: "${clip.hook}"`);
        console.log(`          Fichier: ${clip.readable_filename}`);
    });

    log("FINALIZATION", "SUCCESS", `Sélection sauvegardée: ${outputFilename}`, "Prêt pour CHLOE");

    console.log(`\n[MARC] ✅ Terminé. Ordre de production envoyé à CHLOE.\n`);
}

run().catch(e => {
    log("ERROR", "FAILED", e.message);
    process.exit(1);
});

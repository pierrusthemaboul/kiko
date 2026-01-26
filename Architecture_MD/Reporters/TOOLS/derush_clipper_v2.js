#!/usr/bin/env node

/**
 * Derush Clipper V2 - Découpage intelligent avec métadonnées
 *
 * Version améliorée qui utilise les métadonnées temporelles générées
 * par l'app React Native pour découper automatiquement les vidéos
 * en clips synchronisés avec les événements historiques.
 *
 * @version 2.0.0
 * @date 2026-01-13
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const inputVideo = process.argv[2];
const metadataFile = process.argv[3];

if (!inputVideo || !metadataFile) {
    console.error('❌ Usage: node derush_clipper_v2.js <video.mp4> <metadata.json>');
    console.error('\nExemple:');
    console.error('  node derush_clipper_v2.js ../ASSETS_RAW/raw_gameplay.mp4 ../ASSETS_RAW/metadata.json');
    process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '../OUTPUTS/clips');
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`🎬 DERUSH CLIPPER V2 : "Découpage intelligent avec métadonnées"`);
console.log(`   📹 Vidéo source : ${path.basename(inputVideo)}`);
console.log(`   📄 Métadonnées : ${path.basename(metadataFile)}`);
console.log(`   📁 Destination : OUTPUTS/clips/`);
console.log(`\n🔥 NOUVEAU : Synchronisation automatique vidéo ↔ événements historiques\n`);

// Vérifier que ffmpeg est installé
try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
} catch (e) {
    console.error('❌ ERREUR : ffmpeg n\'est pas installé.');
    console.error('   Installation : sudo apt install ffmpeg (Linux)');
    console.error('   ou : brew install ffmpeg (Mac)');
    process.exit(1);
}

// Vérifier que les fichiers existent
if (!fs.existsSync(inputVideo)) {
    console.error(`❌ ERREUR : Fichier vidéo introuvable : ${inputVideo}`);
    process.exit(1);
}

if (!fs.existsSync(metadataFile)) {
    console.error(`❌ ERREUR : Fichier métadonnées introuvable : ${metadataFile}`);
    process.exit(1);
}

// Charger les métadonnées
let metadata;
try {
    const metadataContent = fs.readFileSync(metadataFile, 'utf8');
    metadata = JSON.parse(metadataContent);
    console.log(`✅ Métadonnées chargées: ${metadata.events_timeline.length} événements`);
} catch (error) {
    console.error(`❌ ERREUR : Impossible de lire les métadonnées: ${error.message}`);
    process.exit(1);
}

// Obtenir la durée totale de la vidéo
const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputVideo}"`;
const totalDuration = parseFloat(execSync(durationCmd).toString().trim());

console.log(`   ⏱️  Durée vidéo : ${totalDuration.toFixed(1)}s`);
console.log(`   📊 Session ID : ${metadata.session_id}`);
console.log(`   🎮 Mode : ${metadata.mode}`);
console.log(`   🏆 Résultat : ${metadata.resultat?.toUpperCase() || 'EN COURS'}`);
console.log(`\n📋 Découpage en ${metadata.events_timeline.length} clips (1 par événement)\n`);

// Créer un manifest de delivery pour K-Hive
const deliveryManifest = {
    session_id: metadata.session_id,
    video_source: path.basename(inputVideo),
    total_duration: totalDuration,
    clips: [],
    metadata: {
        mode: metadata.mode,
        user: metadata.user_name,
        score: metadata.score_final || metadata.score_initial,
        level: metadata.final_level || metadata.initial_level,
        resultat: metadata.resultat,
        accuracy: metadata.accuracy_percent,
    }
};

// Découper chaque événement
metadata.events_timeline.forEach((evt, index) => {
    const nextEvt = metadata.events_timeline[index + 1];
    // Calculer la fin du clip (Padding pour TikTok)
    // Détecter un "VIP Highlight" (Notoriété > 90)
    const isVip = evt.event_notoriete > 90;
    const paddingAfter = isVip ? 15 : 4; // 15s pour les VIP pour voir le succès/contexte

    const PADDING_BEFORE = 5; // s
    let start = Math.max(0, evt.timecode_apparition - PADDING_BEFORE);
    let end;

    if (evt.timecode_choix) {
        // Finir après le choix pour voir la réaction/feedback
        end = Math.min(totalDuration, evt.timecode_choix + paddingAfter);
    } else if (nextEvt) {
        end = nextEvt.timecode_apparition;
    } else {
        end = Math.min(start + (isVip ? 20 : 15), totalDuration);
    }

    // Assurer une durée minimum de 8s si possible
    if ((end - start) < 8 && nextEvt) {
        end = Math.min(totalDuration, start + 10);
    }

    const duration = end - start;

    // Générer le nom de fichier
    const sanitizedTitle = evt.event_titre
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50);

    const outputSubdir = isVip ? path.join(OUTPUT_DIR, 'VIP_HIGHLIGHTS') : OUTPUT_DIR;
    if (!fs.existsSync(outputSubdir)) fs.mkdirSync(outputSubdir, { recursive: true });

    const outputFile = path.join(
        outputSubdir,
        `${metadata.session_id}_tour${evt.tour}_${sanitizedTitle}.mp4`
    );

    console.log(`   Clip ${index + 1}/${metadata.events_timeline.length} : Tour ${evt.tour}${isVip ? ' ⭐ VIP ⭐' : ''}`);
    console.log(`      📅 Événement : ${evt.event_titre} (${evt.event_date})`);
    console.log(`      ⏱️  Timecode : ${start.toFixed(1)}s → ${end.toFixed(1)}s (${duration.toFixed(1)}s)`);
    if (evt.choix) {
        const icon = evt.correct ? '✅' : '❌';
        console.log(`      🎯 Choix : ${evt.choix.toUpperCase()} ${icon} (${evt.duree_reflexion?.toFixed(1)}s)`);
    }

    try {
        // Découper le clip avec ffmpeg
        execSync(
            `ffmpeg -i "${inputVideo}" -ss ${start} -t ${duration} -c copy "${outputFile}" -y -loglevel error`,
            { stdio: 'inherit' }
        );
        console.log(`      ✅ Créé : ${path.basename(outputFile)}\n`);

        // Ajouter au manifest
        deliveryManifest.clips.push({
            clip_id: `clip_${evt.tour}`,
            filename: path.basename(outputFile),
            tour: evt.tour,
            timecode_start: start,
            timecode_end: end,
            duration: duration,
            evenement: {
                titre: evt.event_titre,
                date: evt.event_date,
                description: evt.event_description,
                types: evt.event_types,
                notoriete: evt.event_notoriete,
            },
            choix: evt.choix ? {
                reponse: evt.choix,
                correct: evt.correct,
                duree_reflexion: evt.duree_reflexion,
            } : null,
            reference_event: evt.event_reference_id ? {
                id: evt.event_reference_id,
                date: evt.event_reference_date,
            } : null,
            hook_suggere: generateHook(evt),
        });
    } catch (e) {
        console.error(`      ❌ Erreur découpage clip ${index + 1}: ${e.message}\n`);
    }
});

// --- NOUVEAU : GÉNÉRATION DE SÉQUENCES NARRATIVES (Runs) ---
console.log(`🎬 GÉNÉRATION DE SÉQUENCES NARRATIVES (Runs)...`);

const SEQUENCES = [];
let currentSequence = [];

metadata.events_timeline.forEach((evt, index) => {
    const nextEvt = metadata.events_timeline[index + 1];
    currentSequence.push(evt);

    // Détecter un "Gap" de transition (Level end, pause longue, etc.)
    const gap = nextEvt ? (nextEvt.timecode_apparition - (evt.timecode_choix || evt.timecode_apparition)) : 100;

    if (gap > 8 || currentSequence.length >= 4) {
        // Fin de séquence
        const first = currentSequence[0];
        const last = currentSequence[currentSequence.length - 1];

        const seqStart = Math.max(0, first.timecode_apparition - 5);
        const seqEnd = Math.min(totalDuration, (last.timecode_choix || last.timecode_apparition) + 10); // +10s pour voir Jeanne d'Arc
        const seqDuration = seqEnd - seqStart;

        const seqName = path.join(OUTPUT_DIR, `${metadata.session_id}_SEQUENCE_${SEQUENCES.length + 1}.mp4`);

        console.log(`   🎞️ Sequence ${SEQUENCES.length + 1} (${seqDuration.toFixed(1)}s) : ${currentSequence.length} événements`);

        try {
            execSync(`ffmpeg -i "${inputVideo}" -ss ${seqStart} -t ${seqDuration} -c copy "${seqName}" -y -loglevel error`);
            SEQUENCES.push({
                file: path.basename(seqName),
                duration: seqDuration,
                event_count: currentSequence.length,
                events: currentSequence.map(e => e.event_titre)
            });
        } catch (e) {
            console.error(`      ❌ Erreur Sequence : ${e.message}`);
        }

        currentSequence = [];
    }
});

deliveryManifest.sequences = SEQUENCES;

// Sauvegarder le manifest de delivery
const manifestPath = path.join(OUTPUT_DIR, `${metadata.session_id}_DELIVERY_MANIFEST.json`);
fs.writeFileSync(manifestPath, JSON.stringify(deliveryManifest, null, 2));

console.log(`\n✅ DÉCOUPAGE TERMINÉ`);
console.log(`\n📦 LIVRABLES POUR K-HIVE :`);
console.log(`   📁 ${OUTPUT_DIR}`);
console.log(`   📹 ${deliveryManifest.clips.length} clips vidéo`);
console.log(`   📄 1 manifest de delivery`);

console.log(`\n📊 STATISTIQUES DES CLIPS :`);
console.log(`   Total clips : ${deliveryManifest.clips.length}`);
const correctClips = deliveryManifest.clips.filter(c => c.choix?.correct).length;
const incorrectClips = deliveryManifest.clips.filter(c => c.choix && !c.choix.correct).length;
console.log(`   Clips corrects : ${correctClips}`);
console.log(`   Clips incorrects : ${incorrectClips}`);

const avgDuration = deliveryManifest.clips.reduce((sum, c) => sum + c.duration, 0) / deliveryManifest.clips.length;
console.log(`   Durée moyenne : ${avgDuration.toFixed(1)}s`);

console.log(`\n📋 PROCHAINES ÉTAPES (Workflow Reporters) :`);
console.log(`   1. Vérifier les clips générés`);
console.log(`   2. Valider avec Lucas (lucas_validator.js)`);
console.log(`   3. Livrer à K-Hive dans DATA_OUTBOX/TO_K_HIVE/`);

console.log(`\n💡 K-HIVE PEUT MAINTENANT :`);
console.log(`   • Créer des posts TikTok avec hooks automatiques`);
console.log(`   • Ajouter des overlays (titre, date, explication)`);
console.log(`   • Filtrer par thème historique (${metadata.events_timeline.map(e => e.event_date.split('-')[0]).join(', ')})`);
console.log(`   • Optimiser le storytelling (réponses correctes vs incorrectes)`);

console.log(`\n🎯 MANIFEST DE DELIVERY :`);
console.log(`   ${manifestPath}`);

/**
 * Génère un hook marketing automatique
 */
function generateHook(evt) {
    const year = evt.event_date.split('-')[0];

    const hooks = [
        `📅 ${year} : ${evt.event_titre}`,
        `🎯 Saviez-vous que ${evt.event_titre} s'est produit en ${year} ?`,
        `⚡ ${evt.event_titre} - Une date à connaître !`,
        `🔥 ${year} : Un tournant historique`,
        `📖 Histoire : ${evt.event_titre}`,
    ];

    // Choisir un hook basé sur l'événement (déterministe)
    const hookIndex = evt.tour % hooks.length;
    return hooks[hookIndex];
}

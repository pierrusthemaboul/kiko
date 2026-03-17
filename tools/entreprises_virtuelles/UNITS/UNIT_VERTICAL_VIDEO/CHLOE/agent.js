#!/usr/bin/env node
/**
 * Agent CHLOE - Production TikTok
 *
 * Transforme les clips en vidéos TikTok:
 * 1. Format 9:16 avec fond flou
 * 2. Hook texte visible pendant 6 secondes
 * 3. Noms de fichiers lisibles
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Chemins
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
        action,
        status,
        detail,
        reason
    };

    // Console
    const icon = status === 'OK' || status === 'SUCCESS' ? '✅' :
        status === 'FAILED' ? '❌' :
            status === 'PROCESS' ? '⏳' : '📝';
    console.log(`[CHLOE] ${icon} ${action}: ${detail}`);

    // Fichier log
    const logFile = path.join(LOGS_DIR, `chloe_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    return entry;
}

// ============ PRODUCTION VIDÉO ============
async function produceVideo(clip, videoInputPath) {
    return new Promise((resolve, reject) => {
        // Nom de sortie simple (tiktok.mp4, tiktok(1).mp4...)
        let outputFilename = `${config.production.naming_prefix}.mp4`;
        let counter = 1;
        while (fs.existsSync(path.join(OUTPUT_DIR, outputFilename))) {
            outputFilename = `${config.production.naming_prefix}(${counter}).mp4`;
            counter++;
        }
        const outputPath = path.join(OUTPUT_DIR, outputFilename);

        log("ENCODING", "PROCESS", `Production: ${outputFilename}`);
        console.log(`         Hook: "${clip.hook}"`);

        // Préparer le hook texte pour FFmpeg
        // Wrap le texte si trop long (max 20 chars par ligne)
        const wrapText = (text, maxLen) => {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            for (const word of words) {
                if ((currentLine + ' ' + word).trim().length <= maxLen) {
                    currentLine = (currentLine + ' ' + word).trim();
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            if (currentLine) lines.push(currentLine);

            return lines.join('\\n');
        };

        const wrappedHook = wrapText(clip.hook, 22);

        // Échapper les caractères spéciaux pour FFmpeg
        const escapedHook = wrappedHook
            .replace(/'/g, "'\\''")
            .replace(/:/g, "\\:")
            .replace(/\[/g, "\\[")
            .replace(/\]/g, "\\]");

        // Construire le filtre FFmpeg complexe
        const cropFilter = config.video.crop_top_px
            ? `crop=in_w:in_h-${config.video.crop_top_px}:0:${config.video.crop_top_px},scale=1080:1920`
            : 'scale=1080:1920';

        const hasBanner = config.hook.banner_path && fs.existsSync(path.resolve(__dirname, config.hook.banner_path));
        const hasCtaImage = config.cta.enabled && fs.existsSync(path.resolve(__dirname, config.cta.image_path));

        const hookText = config.hook.text || escapedHook;
        const hookShadow = config.hook.shadow ? ':shadowcolor=black@0.8:shadowx=4:shadowy=4' : '';

        // 4. Hook (Texte ou Banner)
        let hookFilter;
        let hookInputIndex = 1;
        if (hasBanner) {
            // Overlay du banner avec rotation et redimensionnement
            const rotationRad = (config.hook.rotation || 0) * Math.PI / 180;
            hookFilter = `[${hookInputIndex}:v]scale=500:-1,rotate=${rotationRad}:c=none:ow='rotw(${rotationRad})':oh='roth(${rotationRad})'[rotated_banner];[v1][rotated_banner]overlay=50:150:enable='between(t,0,${config.hook.duration_seconds})'[v2]`;
            hookInputIndex++;
        } else {
            const revealFilter = config.hook.effect === 'reveal'
                ? `,drawbox=x=0+t*${config.hook.reveal_speed}:y=${config.hook.position_y - 20}:w=1080:h=200:color=${config.hook.bg_color}:t=fill:enable='between(t,0,${config.hook.duration_seconds})'`
                : '';
            hookFilter = `[v1]drawtext=text='${hookText}':fontcolor=${config.hook.font_color}:fontsize=${config.hook.font_size}:x=(w-text_w)/2:y=${config.hook.position_y}:box=1:boxcolor=${config.hook.bg_color}@${config.hook.bg_opacity}:boxborderw=15:line_spacing=8${hookShadow}:enable='between(t,0,${config.hook.duration_seconds})'${revealFilter}[v2]`;
        }

        const ctaInputIndex = hasBanner ? 2 : 1;
        const ctaImageOverlay = hasCtaImage
            ? `[${ctaInputIndex}:v]scale=400:-1[cta_scaled];[v2][cta_scaled]overlay=(W-w)/2:${config.cta.position_y}:enable='gt(t,${config.video.target_duration - config.cta.start_at_seconds_before_end})'[v3];[v3]`
            : '[v2]';

        const ctaTextFilter = (config.cta.enabled && config.cta.show_text)
            ? `drawtext=text='${config.cta.text}':fontcolor=${config.cta.font_color}:fontsize=${config.cta.font_size}:x=(w-text_w)/2:y=${config.cta.position_y}:enable='gt(t,${config.video.target_duration - config.cta.start_at_seconds_before_end})'[outv]`
            : 'null[outv]';

        const filterComplex = [
            // 0. Recadrer et mettre à l'échelle
            `[0:v]${cropFilter},split[v_split1][v_split2]`,
            // 1. Créer le fond flou
            `[v_split1]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=${config.video.bg_blur}:5[bg]`,
            // 2. Redimensionner le gameplay (après le crop initial)
            `[v_split2]scale=-1:1920:force_original_aspect_ratio=decrease[fg]`,
            // 3. Superposer gameplay sur fond
            `[bg][fg]overlay=(W-w)/2:(H-h)/2[v1]`,
            // 4 & 5. Hook et CTA
            hookFilter,
            ctaImageOverlay + ctaTextFilter
        ].join(';');

        // Arguments FFmpeg
        const ffmpegArgs = ['-y'];

        // Input 0: Vidéo source
        if (config.video.loop_if_short) ffmpegArgs.push('-stream_loop', '-1');
        ffmpegArgs.push('-i', videoInputPath);

        // Input 1: Banner (si présent)
        if (hasBanner) {
            ffmpegArgs.push('-i', path.resolve(__dirname, config.hook.banner_path));
        }

        // Input 1 ou 2: CTA Image (si présente)
        if (hasCtaImage) {
            ffmpegArgs.push('-i', path.resolve(__dirname, config.cta.image_path));
        }

        ffmpegArgs.push(
            '-t', config.video.target_duration.toString(),
            '-filter_complex', filterComplex,
            '-map', '[outv]',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-r', config.video.fps.toString(),
            '-b:v', config.video.bitrate,
            '-c:a', 'aac',
            '-b:a', '128k',
            outputPath
        );

        console.log("FFMPEG ARGS:", ffmpegArgs.join(' '));

        const startTime = Date.now();
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        let lastProgress = '';

        ffmpeg.stderr.on('data', (data) => {
            const str = data.toString();
            // Extraire le temps encodé
            const timeMatch = str.match(/time=(\d{2}:\d{2}:\d{2})/);
            if (timeMatch && timeMatch[1] !== lastProgress) {
                lastProgress = timeMatch[1];
                process.stdout.write(`\r         Encodage: ${lastProgress}`);
            }
        });

        ffmpeg.on('close', (code) => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(''); // Nouvelle ligne

            if (code === 0 && fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

                log("EXPORT", "SUCCESS", `${outputFilename} (${sizeMB} MB, ${duration}s)`);

                // Générer le rapport de production
                const reportContent = `# Rapport de Production - ${outputFilename}

## Métadonnées
- Date: ${new Date().toLocaleString()}
- Durée: ${config.video.target_duration}s
- Taille: ${sizeMB} MB
- Résolution: ${config.video.resolution}

## Source
- Clip original: ${clip.original_filename}
- Durée originale: (Boucle activée)

## Éléments ajoutés
- Hook: "${hookText}"
- Effet hook: ${config.hook.effect} (vitesse: ${config.hook.reveal_speed})
- Badge Banner: ${hasBanner ? 'Utilisé' : 'Aucun'}
- Crop: ${config.video.crop_top_px}px en haut
- CTA Image: ${hasCtaImage ? 'Affichée' : 'Aucune'}
- CTA Texte: ${config.cta.show_text ? config.cta.text : 'Masqué'}
- CTA visible: dernieres ${config.cta.start_at_seconds_before_end}s

## Filtres FFmpeg
\`\`\`
${filterComplex}
\`\`\`
`;
                const reportPath = outputPath.replace('.mp4', '_RAPPORT.md');
                fs.writeFileSync(reportPath, reportContent);

                resolve({
                    input: clip.original_filename,
                    output: outputFilename,
                    outputPath,
                    hook: clip.hook,
                    sizeMB: parseFloat(sizeMB),
                    encodingTime: parseFloat(duration)
                });
            } else {
                log("EXPORT", "FAILED", `Erreur FFmpeg code ${code}`, outputFilename);
                resolve(null);
            }
        });

        ffmpeg.on('error', (err) => {
            log("EXPORT", "FAILED", err.message, outputFilename);
            resolve(null);
        });
    });
}

// ============ MAIN ============
async function run() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  CHLOE - Production TikTok v${config.version}     ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    log("INITIALIZATION", "OK", "Agent CHLOE prête");

    // Chercher la sélection de MARC
    const selectionFiles = fs.readdirSync(INPUT_DIR).filter(f => f.startsWith('selection_'));

    if (selectionFiles.length === 0) {
        log("SCAN", "FAILED", "Aucune sélection MARC trouvée", "Attente ordre de production");
        return;
    }

    const latestSelection = selectionFiles.sort().reverse()[0];
    log("SCAN", "OK", `Sélection trouvée: ${latestSelection}`);

    if (config.production.clean_output_before_run) {
        log("CLEAN", "PROCESS", "Nettoyage du dossier OUTPUT");
        fs.readdirSync(OUTPUT_DIR).forEach(file => {
            if (file.endsWith('.mp4') || file.endsWith('.md')) {
                fs.unlinkSync(path.join(OUTPUT_DIR, file));
            }
        });
    }

    const selection = JSON.parse(fs.readFileSync(path.join(INPUT_DIR, latestSelection), 'utf8'));

    const clipsToProduce = config.production.limit_clips
        ? selection.clips.slice(0, config.production.limit_clips)
        : selection.clips;

    log("READ", "OK", `Session: ${selection.session_id}, ${clipsToProduce.length} clips à produire`);
    console.log(`         Stratégie: ${selection.selection_method}\n`);

    // Produire chaque clip
    const results = [];

    for (let i = 0; i < clipsToProduce.length; i++) {
        const clip = clipsToProduce[i];

        console.log(`\n[CHLOE] 📹 Clip ${i + 1}/${clipsToProduce.length}`);

        // Trouver le fichier vidéo source
        const videoInputPath = path.join(INPUT_DIR, clip.original_filename);

        if (!fs.existsSync(videoInputPath)) {
            log("SCAN", "FAILED", `Fichier source introuvable: ${clip.original_filename}`);
            continue;
        }

        const result = await produceVideo(clip, videoInputPath);
        if (result) {
            results.push(result);
        }
    }

    // Résumé final
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Résultat                              ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    console.log(`[CHLOE] 📦 ${results.length}/${selection.clips.length} vidéos produites\n`);

    results.forEach((r, i) => {
        console.log(`       ${i + 1}. ${r.output}`);
        console.log(`          Hook: "${r.hook}"`);
        console.log(`          Taille: ${r.sizeMB} MB`);
    });

    log("FINALIZATION", "SUCCESS", `${results.length} vidéos TikTok produites`, "Prêt pour LEA");

    console.log(`\n[CHLOE] ✅ Terminé. Vidéos envoyées à LEA pour validation.\n`);
}

run().catch(e => {
    log("ERROR", "FAILED", e.message);
    process.exit(1);
});


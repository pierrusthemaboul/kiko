const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

function log(action, status, detail) {
    console.log(`[${status}] ${action}: ${detail}`);
}

async function run() {
    log("INITIALIZATION", "OK", "Agent DERUSH (Mode Verbose)");

    const inputDir = path.join(__dirname, config.storage.input);
    const files = fs.readdirSync(inputDir);

    const metadataFile = files.find(f => f.endsWith('_metadata.json'));
    const videoFile = files.find(f => f.startsWith('raw_') && f.endsWith('.mp4'));

    if (!metadataFile || !videoFile) {
        log("INPUT", "FAILED", "Couple Vidéo/JSON incomplet dans INPUT");
        return;
    }

    const sessionId = metadataFile.replace('_metadata.json', '');
    log("SESSION", "LOAD", `Traitement de la session : ${sessionId}`);
    log("VIDEO", "LOAD", `Vidéo source : ${videoFile}`);

    try {
        const metadata = JSON.parse(fs.readFileSync(path.join(inputDir, metadataFile), 'utf8'));
        const outputDir = path.join(__dirname, config.storage.output);
        const generatedClips = [];

        log("METADATA", "OK", `${metadata.events_timeline.length} événements détectés dans le manifest`);

        metadata.events_timeline.forEach((evt, index) => {
            const isVip = evt.event_notoriete > 90;

            // Calcul intelligent pour atteindre la durée cible (25-30s)
            let start = Math.max(0, evt.timecode_apparition - config.padding.before);
            let end = evt.timecode_choix ? (evt.timecode_choix + (isVip ? config.padding.vip : config.padding.standard)) : (start + 25);

            let duration = end - start;

            // Si c'est trop court, on rajoute du temps APRES (pour que le public voit le résultat)
            if (duration < config.target_duration) {
                end = start + config.target_duration;
                duration = config.target_duration;
            }

            const sanitizedTitle = evt.event_titre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            const fileName = `${sessionId}_tour${evt.tour}_${sanitizedTitle}.mp4`;
            const outputFile = path.join(outputDir, fileName);

            log("CLIPPING", "PROCESS", `[Clip ${index + 1}] ${evt.event_titre} | Début: ${start.toFixed(1)}s | Durée: ${duration.toFixed(1)}s`);

            execSync(`ffmpeg -i "${path.join(inputDir, videoFile)}" -ss ${start} -t ${duration} -c copy "${outputFile}" -y -loglevel error`);

            if (fs.existsSync(outputFile)) {
                const size = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
                log("CLIP_SAVED", "SUCCESS", `Fichier: ${fileName} (${size} Mo)`);
                generatedClips.push({
                    filename: fileName,
                    tour: evt.tour,
                    evenement: {
                        titre: evt.event_titre,
                        date: evt.event_date,
                        description: evt.event_description,
                        notoriete: evt.event_notoriete
                    },
                    choix: evt.choix,
                    duration: duration
                });
            }
        });

        fs.writeFileSync(path.join(outputDir, `${sessionId}_DELIVERY_MANIFEST.json`), JSON.stringify({
            session_id: sessionId,
            clips: generatedClips,
        }, null, 2));

        log("PROCESS_FINAL", "SUCCESS", `Livraison de ${generatedClips.length} clips prête pour K-Hive`);
    } catch (e) {
        log("ERROR", "FAILED", e.message);
    }
}
run();

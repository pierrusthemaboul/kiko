const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config.json');

function log(action, status, detail) {
    console.log(`[${status}] ${action}: ${detail}`);
}

function drawProgressBar(current, total, label) {
    if (!process.stdout.isTTY) return;
    const width = 30;
    const progress = Math.min(Math.max(current / total, 0), 1);
    const filledWidth = Math.floor(width * progress);
    const bar = "█".repeat(filledWidth) + "░".repeat(width - filledWidth);
    const percent = Math.floor(progress * 100);
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(`🎥 ${label} [${bar}] ${percent}% | Reste: ${Math.max(0, total - current)}s  `);
}

async function run() {
    log("INITIALIZATION", "OK", "Agent TOM (Lead Simulator) réveillé");

    const duration = parseInt(process.argv[2]) || config.duration_default;
    const tempVideo = path.join(__dirname, config.storage.output, 'temp_capture.mp4');
    
    log("RECORD_START", "PROCESS", `Démarrage de la capture vidéo pour ${duration} secondes...`);

    const scrcpy = spawn(config.tools.scrcpy_path, [
        '--record', tempVideo, '--no-audio', '--max-fps', '30', '--max-size', '1024'
    ]);

    let elapsed = 0;
    const interval = setInterval(() => {
        elapsed++;
        drawProgressBar(elapsed, duration, "Enregistrement");
        if (elapsed >= duration) {
            clearInterval(interval);
            console.log("\n[OK] Temps écoulé, finalisation de la vidéo...");
            scrcpy.kill('SIGINT');
        }
    }, 1000);

    scrcpy.on('close', () => {
        clearInterval(interval);
        if (fs.existsSync(tempVideo) && fs.statSync(tempVideo).size > 1000) {
            log("RECORD_END", "SUCCESS", `Vidéo brute capturée (${(fs.statSync(tempVideo).size / 1024 / 1024).toFixed(2)} Mo)`);

            log("FETCH_DATA", "PROCESS", "Communication avec le téléphone pour les métadonnées...");
            try {
                execSync('node fetcher_v0.js --latest', { cwd: __dirname });
                
                const files = fs.readdirSync(path.join(__dirname, config.storage.output));
                const jsonFile = files.find(f => f.endsWith('_metadata.json'));
                
                if (jsonFile) {
                    const sessionId = jsonFile.replace('_metadata.json', '');
                    const finalVideo = path.join(__dirname, config.storage.output, `raw_${sessionId}.mp4`);
                    fs.renameSync(tempVideo, finalVideo);
                    log("SYNC", "SUCCESS", `Vidéo synchronisée avec la session : ${sessionId}`);
                } else {
                    log("SYNC", "FAILED", "Impossible d'associer la vidéo à une session JSON. DERUSH risque d'échouer.");
                }
            } catch (e) {
                log("FETCH", "FAILED", "Le téléphone n'a pas répondu ou aucune session n'est présente.");
            }
            process.exit(0);
        } else {
            log("RECORD_END", "FAILED", "La vidéo est vide. Vérifiez la connexion USB ou scrcpy.");
            process.exit(1);
        }
    });
}
run();


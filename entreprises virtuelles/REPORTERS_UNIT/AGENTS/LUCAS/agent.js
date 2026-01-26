const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const TIMESTAMP = Date.now();
const LOG_FILE = path.join(__dirname, config.storage.logs, `lucas_${TIMESTAMP}.json`);

function log(action, status, detail, reason = "") {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: "LUCAS",
        action,
        status,
        detail,
        reason
    };
    console.log(`[${status}] ${action}: ${detail}`);
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
}

async function run() {
    log("INITIALIZATION", "OK", "Agent LUCAS en ligne pour QA");

    const inputDir = path.resolve(__dirname, config.storage.input);
    if (!fs.existsSync(inputDir)) {
        log("SCAN", "FAILED", "Dossier source introuvable", inputDir);
        return;
    }

    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.mp4'));
    log("SCAN", "OK", `${files.length} fichiers à vérifier`);

    files.forEach(file => {
        const filePath = path.join(inputDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = stats.size / 1024;

        if (sizeKB < config.min_file_size_kb) {
            log("VALIDATION", "FAILED", `Fichier trop petit: ${file}`, `Size: ${sizeKB.toFixed(1)} KB`);
            return;
        }

        try {
            // Vérification technique via ffprobe
            execSync(`${config.ffprobe_path} -v error "${filePath}"`);
            log("VALIDATION", "SUCCESS", `Fichier valide: ${file}`);
        } catch (e) {
            log("VALIDATION", "FAILED", `Fichier corrompu: ${file}`, e.message);
        }
    });

    log("FINALIZATION", "OK", "Scan de qualité terminé");
}

run();

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config
const ASSETS_DIR = path.join(__dirname, '../../../../assets/images');
const LOGO_PATH = path.join(ASSETS_DIR, 'oklogo.png');
const OUTPUT_DIR = path.join(__dirname, '../../DATA_INBOX/OUTPUTS');

// Args Parsing
const args = process.argv.slice(2);
const inputPath = args[0];
const overlayIndex = args.indexOf('--overlay');
const overlayPath = overlayIndex !== -1 ? args[overlayIndex + 1] : null;

if (!inputPath) {
    console.error("❌ Usage: node mia.js <video_background.mp4> [--overlay <image.jpg>]");
    process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const filename = `trivia_${Date.now()}.mp4`;
const outputPath = path.join(OUTPUT_DIR, filename);

console.log(`🎬 Mia assemble la vidéo : ${filename}`);
console.log(`   - Fond : ${path.basename(inputPath)}`);
if (overlayPath) console.log(`   - Carte : ${path.basename(overlayPath)}`);

try {
    // Construction Dynamique des Inputs et du FilterComplex
    const cmdArgs = ['-y', '-i', inputPath, '-i', LOGO_PATH];
    let filterComplex = "";

    // 1. Fond : Scale en 9:16 (1080x1920) avec Crop
    filterComplex += `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];`;

    // 2. Logo : Coin Haut Gauche
    filterComplex += `[1:v]scale=150:-1[logo];`;

    // 3. Carte (Overlay) si présente
    if (overlayPath && fs.existsSync(overlayPath)) {
        cmdArgs.push('-i', overlayPath); // Input #2
        // Scale Carte (Largeur 900px)
        filterComplex += `[2:v]scale=900:-1[card];`;
        // Composition : Fond + Carte (Centrée Haut) + Logo
        filterComplex += `[bg][card]overlay=(W-w)/2:300[v1];[v1][logo]overlay=20:20[outv]`;
    } else {
        // Juste Fond + Logo
        filterComplex += `[bg][logo]overlay=20:20[outv]`;
    }

    // Ajout Encode Options
    cmdArgs.push(
        '-filter_complex', `${filterComplex};[outv]fps=30,format=yuv420p[final]`,
        '-map', '[final]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', '2500k',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-t', '30',
        outputPath
    );

    console.log(`🎬 Démarrage FFmpeg (Suivi Live activé)...`);
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', cmdArgs);

    const LOG_FILE = path.join(OUTPUT_DIR, '..', 'LOGS', `production_${Date.now()}.json`);
    if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

    ffmpeg.stderr.on('data', (data) => {
        const str = data.toString();
        // Parsing Time => "time=00:00:15.50"
        const timeMatch = str.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
            const timeParts = timeMatch[1].split(':');
            const seconds = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
            const progress = Math.min(100, Math.round((seconds / 30) * 100)); // 30s max duration

            // WRITE PROGRESS (Atomic write implied)
            fs.writeFileSync(LOG_FILE, JSON.stringify({ status: "RUNNING", progress: progress, last_update: new Date().toISOString() }));
            process.stdout.write(`\r⏳ Progression : ${progress}%`);
        }
    });

    ffmpeg.on('close', (code) => {
        if (code === 0) {
            fs.writeFileSync(LOG_FILE, JSON.stringify({ status: "DONE", progress: 100, file: outputPath }));
            console.log(`\n✅ Terminé : ${outputPath}`);
        } else {
            fs.writeFileSync(LOG_FILE, JSON.stringify({ status: "ERROR", code: code }));
            console.error(`\n❌ Erreur FFMPEG (Code ${code})`);
            process.exit(1);
        }
    });

} catch (e) {
    console.error("❌ Erreur Montage Mia :", e.message);
}

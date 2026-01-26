const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const OUTPUT_DIR = '/home/pierre/kiko/Architecture_MD/K-Hive/DATA_INBOX/OUTPUTS';
const LOGO_PATH = '/home/pierre/kiko/assets/images/logo.png';

// Args Parsing
const args = process.argv.slice(2);
const inputPath = args[0];
const overlayIndex = args.indexOf('--overlay');
const overlayPath = overlayIndex !== -1 ? args[overlayIndex + 1] : null;
const textIndex = args.indexOf('--text');
const hookText = textIndex !== -1 ? args[textIndex + 1] : null;

if (!inputPath) {
    console.error("❌ Usage: node mia.js <video_background.mp4> [--overlay <image.jpg>] [--text \"Hook Text\"]");
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
if (hookText) console.log(`   - Hook : "${hookText}"`);

try {
    const cmdArgs = ['-y', '-i', inputPath, '-i', LOGO_PATH];
    let filterComplex = "";

    // 1. Fond Flou (1080x1920)
    filterComplex += `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg_blur];`;

    // 2. Gameplay net (centré, scale to fit height 1920)
    filterComplex += `[0:v]scale=-1:1920:force_original_aspect_ratio=decrease[gameplay_sharp];`;

    // 3. Mix Fond + Gameplay (Centrage Horizontal et Vertical)
    filterComplex += `[bg_blur][gameplay_sharp]overlay=(W-w)/2:(H-h)/2[v_base];`;

    // 4. Logo : Coin Haut Gauche
    filterComplex += `[1:v]scale=150:-1[logo];[v_base][logo]overlay=30:30[v_composed];`;

    let finalRef = "v_composed";

    // 5. Overlay Carte si présente
    if (overlayPath && fs.existsSync(overlayPath)) {
        cmdArgs.push('-i', overlayPath);
        filterComplex += `[2:v]scale=900:-1[card];[v_composed][card]overlay=(W-w)/2:300[v_card];`;
        finalRef = "v_card";
    }

    // 6. Hook Texte avec Auto-Wrap & Safe Zone
    if (hookText) {
        const wrapText = (str, limit) => {
            const words = str.split(' ');
            let lines = []; let currentLine = "";
            words.forEach(word => {
                if ((currentLine + word).length > limit) {
                    lines.push(currentLine.trim()); currentLine = word + " ";
                } else { currentLine += word + " "; }
            });
            lines.push(currentLine.trim());
            return lines.join('\n');
        };

        const wrappedText = wrapText(hookText, 18); // Limite plus stricte pour éviter tout crop
        const escapedText = wrappedText.replace(/'/g, "'\\\\\\''").replace(/:/g, "\\:");

        // On évite drawtext si possible ou on utilise une syntaxe blindée
        // Hook éphémère (Disparaît après 6s) pour la rétention TikTok
        filterComplex += `[${finalRef}]drawtext=text='${escapedText}':fontcolor=white:fontsize=65:font=Sans:x=(w-text_w)/2:y=450:box=1:boxcolor=black@0.6:boxborderw=25:line_spacing=15:enable='between(t,0,6)'[outv]`;
    } else {
        filterComplex += `[${finalRef}]copy[outv]`;
    }

    cmdArgs.push(
        '-filter_complex', `${filterComplex};[outv]fps=30,format=yuv420p[final]`,
        '-map', '[final]', '-map', '0:a?',
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3500k',
        outputPath
    );

    const inputDuration = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`).toString());

    console.log(`🎬 Démarrage FFmpeg...`);
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', cmdArgs);

    ffmpeg.stderr.on('data', (data) => {
        const str = data.toString();
        const timeMatch = str.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) {
            const timeParts = timeMatch[1].split(':');
            const seconds = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
            const progress = Math.min(100, Math.round((seconds / inputDuration) * 100));
            process.stdout.write(`\r⏳ Progression : ${progress}%`);
        }
    });

    ffmpeg.on('close', (code) => {
        if (code === 0) console.log(`\n✅ Terminé : ${outputPath}`);
        else console.error(`\n❌ FFmpeg Error: ${code}`);
    });

} catch (e) {
    console.error(`❌ Erreur Mia : ${e.message}`);
}

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * SLIDESHOW ENGINE (Ken Burns Effect)
 * Usage: node slideshow.js --images "img1.png,img2.png" --audio "music.mp3" --output "tiktok_story.mp4"
 * 
 * Description:
 * Creates a dynamic video from static images using FFmpeg's zoompan filter.
 * Simulates a "Documentary" feel (Netflix style).
 */

const outputDir = path.join(__dirname, '../../DATA_INBOX/OUTPUTS');
const logsDir = path.join(__dirname, '../../DATA_INBOX/LOGS');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

// Arguments Parsing
const args = {};
process.argv.slice(2).forEach((val, index, array) => {
    if (val.startsWith('--')) {
        const key = val.substring(2);
        const next = array[index + 1];
        if (next && !next.startsWith('--')) {
            args[key] = next;
        }
    }
});

const images = args.images ? args.images.split(',') : [];
const audio = args.audio || null;
const output = args.output ? path.join(outputDir, args.output) : path.join(outputDir, `story_${Date.now()}.mp4`);
const DURATION_PER_IMAGE = 5; // seconds
const FPS = 30;

if (images.length === 0) {
    console.error("❌ Erreur: Aucune image fournie (--images)");
    process.exit(1);
}

console.log(`🎬 Démarrage Production Slideshow (${images.length} images)...`);

// Construction du Filter Complex Graph
// zoompan=z='min(zoom+0.0015,1.5)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920
// On alterne Zoom In et Zoom Out pour varier

let inputs = "";
let filterComplex = "";
let mapConcat = "";

images.forEach((img, index) => {
    inputs += `-loop 1 -t ${DURATION_PER_IMAGE} -i "${img}" `;

    // Effet Alterné : Pair (0, 2...) = Zoom IN | Impair = Zoom OUT
    // Zoom IN : z='min(zoom+0.0015,1.5)'
    // Zoom OUT : z='if(eq(on,1),1.5,max(1.0,zoom-0.0015))' (Start at 1.5, go down)

    const isZoomIn = index % 2 === 0;
    const zoomExpr = isZoomIn
        ? "z='min(zoom+0.0015,1.5)'"
        : "z='1.5-0.0015*on'"; // Simple linear zoom out simulation

    // Scale to vertical 1080x1920 BEFORE zoompan to avoid aspect ratio issues ? NO, zoompan handles 's'.
    // Important: input images might not be 9:16. We crop/scale first?
    // Let's do scale+crop first, then zoompan.

    filterComplex += `[${index}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,`;
    filterComplex += `zoompan=${zoomExpr}:d=${DURATION_PER_IMAGE * FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS}[v${index}];`;

    mapConcat += `[v${index}]`;
});

filterComplex += `${mapConcat}concat=n=${images.length}:v=1:a=0[vfinal]`;

const cmdArgs = [];
// Inputs
images.forEach(img => {
    cmdArgs.push('-loop', '1', '-t', `${DURATION_PER_IMAGE}`, '-i', img);
});

// Audio Input (if present)
if (audio && fs.existsSync(audio)) {
    cmdArgs.push('-stream_loop', '-1', '-i', audio); // Loop audio
}

// Filters
cmdArgs.push('-filter_complex', filterComplex);

// Maps
cmdArgs.push('-map', '[vfinal]');
if (audio && fs.existsSync(audio)) {
    cmdArgs.push('-map', `${images.length}:a`); // Audio index is last
    cmdArgs.push('-shortest'); // Stop when video stops
}

// Encode
cmdArgs.push(
    '-c:v', 'libx264', '-preset', 'medium', '-b:v', '3000k', '-pix_fmt', 'yuv420p',
    '-y', output
);

// Execution
const logFile = path.join(logsDir, `slideshow_${Date.now()}.json`);
const ffmpeg = spawn('ffmpeg', cmdArgs);

ffmpeg.stderr.on('data', (data) => {
    const str = data.toString();
    const timeMatch = str.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
    if (timeMatch) {
        process.stdout.write(`\r⏳ Progression : ${timeMatch[1]}`);
    }
});

ffmpeg.on('close', (code) => {
    if (code === 0) {
        fs.writeFileSync(logFile, JSON.stringify({ status: "DONE", file: output }));
        console.log(`\n✅ Vidéo Storytelling générée : ${output}`);
    } else {
        fs.writeFileSync(logFile, JSON.stringify({ status: "ERROR", code }));
        console.error(`\n❌ Erreur FFmpeg (Code ${code})`);
    }
});

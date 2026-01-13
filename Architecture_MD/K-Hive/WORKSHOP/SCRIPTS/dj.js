const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Config
const MUSIC_DIR = path.join(__dirname, '../../../../assets/music');

// Args
const args = process.argv.slice(2);
const url = args[0]; // URL Youtube

if (!url) {
    console.log("🎵 DJ Bot Ready.");
    console.log("Usage: node dj.js <Youtube_URL>");
    process.exit(0);
}

// Vérifier si yt-dlp est là
try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
} catch (e) {
    console.error("❌ ERREUR : 'yt-dlp' n'est pas installé.");
    console.error("👉 Installez-le avec : sudo snap install yt-dlp");
    process.exit(1);
}

// Créer dossier
if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

console.log(`🎧 DJ lance le téléchargement : ${url}...`);

try {
    // Commande : Download audio only, convert to mp3, save to assets/music
    const outputTemplate = path.join(MUSIC_DIR, '%(title)s.%(ext)s');
    const cmd = `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`;

    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ Musique ajoutée à la bibliothèque : ${MUSIC_DIR}`);
} catch (e) {
    console.error("❌ Erreur DJ :", e.message);
}

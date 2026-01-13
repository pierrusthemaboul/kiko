const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const inputImage = process.argv[2];

if (!inputImage) {
    console.error('❌ Usage: node extract_game_data.js <screenshot.png> [--output data.json]');
    console.error('\nCe script extrait les données techniques visibles à l\'écran :');
    console.error('  - Score');
    console.error('  - Événements historiques affichés');
    console.error('  - Dates');
    console.error('  - État de la partie (victoire/défaite)');
    console.error('\nNote : Nécessite une API OCR ou Vision (Google Vision, Tesseract, etc.)');
    process.exit(1);
}

console.log(`🔍 EXTRACT GAME DATA : "Analyse technique de la capture"`);
console.log(`   📸 Image source : ${path.basename(inputImage)}`);
console.log(`\n⚠️  IMPORTANT : Extraction de données FACTUELLES uniquement.`);
console.log(`   Pas d'interprétation marketing, pas de storytelling.\n`);

// Vérifier que le fichier existe
if (!fs.existsSync(inputImage)) {
    console.error(`❌ ERREUR : Fichier introuvable : ${inputImage}`);
    process.exit(1);
}

// Déterminer le fichier de sortie
const outputArg = process.argv.indexOf('--output');
const outputFile = outputArg !== -1 ? process.argv[outputArg + 1] : null;

console.log('🤖 Méthode d\'extraction : OCR + Vision AI\n');

// Option 1 : Tesseract (OCR local, gratuit)
console.log('📋 Option 1 : Tesseract OCR (local)');
try {
    execSync('tesseract --version', { stdio: 'ignore' });
    console.log('   ✅ Tesseract disponible');

    // Extraire le texte brut
    const tempTxtFile = '/tmp/ocr_output.txt';
    execSync(`tesseract "${inputImage}" /tmp/ocr_output -l fra+eng`, { stdio: 'ignore' });
    const ocrText = fs.readFileSync(tempTxtFile, 'utf8');

    console.log('\n📄 Texte extrait :\n');
    console.log(ocrText);

    // Parser les données (logique simplifiée, à améliorer)
    const gameData = parseGameData(ocrText);

    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(gameData, null, 2));
        console.log(`\n✅ Données sauvegardées : ${outputFile}`);
    } else {
        console.log('\n📊 Données extraites :');
        console.log(JSON.stringify(gameData, null, 2));
    }

} catch (e) {
    console.log('   ⚠️  Tesseract non installé');
    console.log('   Installation : sudo apt install tesseract-ocr (Linux)');
    console.log('              ou : brew install tesseract (Mac)\n');

    // Option 2 : Google Vision API (cloud, payant)
    console.log('📋 Option 2 : Google Vision API (à implémenter)');
    console.log('   Nécessite : GOOGLE_APPLICATION_CREDENTIALS');
    console.log('   Voir : https://cloud.google.com/vision/docs/ocr\n');

    // Option 3 : Extraction manuelle
    console.log('📋 Option 3 : Saisie manuelle');
    console.log('   Pour l\'instant, créez manuellement le fichier JSON :');
    console.log(`
{
  "mode": "Classique",
  "score": 15420,
  "events": [
    { "name": "Van Gogh - La Nuit étoilée", "year": 1889 },
    { "name": "Première greffe cardiaque", "year": 1967 }
  ],
  "result": "victory",
  "duration_seconds": 150,
  "timestamp": "${new Date().toISOString()}"
}
    `);
}

console.log('\n💡 Ces données sont BRUTES. K-Hive les utilisera pour le marketing.');

// Fonction de parsing simple (à améliorer selon le layout du jeu)
function parseGameData(text) {
    const data = {
        mode: 'Classique', // Détecté via texte ou position
        score: null,
        events: [],
        result: null,
        timestamp: new Date().toISOString()
    };

    // Chercher le score (patterns communs : "Score: 1234", "1234 pts", etc.)
    const scoreMatch = text.match(/(?:score|points?)[:\s]*(\d+)/i);
    if (scoreMatch) {
        data.score = parseInt(scoreMatch[1]);
    }

    // Chercher des années (4 chiffres)
    const years = text.match(/\b(1\d{3}|20\d{2})\b/g);
    if (years) {
        data.events = years.map(year => ({ year: parseInt(year) }));
    }

    // Détection victoire/défaite (mots-clés)
    if (/victoire|gagné|bravo|excellent/i.test(text)) {
        data.result = 'victory';
    } else if (/perdu|défaite|dommage|raté/i.test(text)) {
        data.result = 'defeat';
    }

    return data;
}

// Note : Pour une extraction plus précise, il faudrait :
// 1. Entraîner un modèle sur le layout spécifique de Timalaus
// 2. Utiliser la détection de zones (bounding boxes) pour cibler les éléments
// 3. Ou accéder directement aux logs/API du jeu si disponible

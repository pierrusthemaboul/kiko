const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const assetPath = process.argv[2];

if (!assetPath) {
    console.error('❌ Usage: node lucas_validator.js <fichier> [--checklist]');
    console.error('\nCe script valide la qualité TECHNIQUE d\'un asset :');
    console.error('  - Résolution suffisante');
    console.error('  - Pas de corruption de fichier');
    console.error('  - Durée conforme (pour vidéos)');
    console.error('  - Contenu reflète bien le jeu Timalaus');
    console.error('\nExemples :');
    console.error('  node lucas_validator.js ../ASSETS_RAW/raw_gameplay.mp4');
    console.error('  node lucas_validator.js ../OUTPUTS/screenshots/frame_10s.png');
    process.exit(1);
}

console.log(`🔍 LUCAS (VALIDATOR) : "Contrôle qualité technique"`);
console.log(`   📂 Asset : ${path.basename(assetPath)}`);
console.log(`\n⚠️  IMPORTANT : Lucas valide la TECHNIQUE, pas le marketing.`);
console.log(`   Qualité visuelle, conformité jeu, pas d'évaluation créative.\n`);

// Vérifier que le fichier existe
if (!fs.existsSync(assetPath)) {
    console.error(`❌ ERREUR : Fichier introuvable : ${assetPath}`);
    process.exit(1);
}

const fileExt = path.extname(assetPath).toLowerCase();
const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(fileExt);
const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(fileExt);

let validationScore = 0;
const validationIssues = [];
const validationPassed = [];

console.log('📋 CHECKLIST DE VALIDATION :\n');

// 1. Vérifier la taille du fichier
console.log('1️⃣  Taille du fichier...');
const stats = fs.statSync(assetPath);
const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

if (stats.size === 0) {
    console.log(`   ❌ Fichier vide (0 octets)`);
    validationIssues.push('Fichier vide');
} else if (stats.size < 10000) {
    console.log(`   ⚠️  Fichier très petit (${fileSizeMB} MB) - suspect`);
    validationIssues.push('Fichier anormalement petit');
} else {
    console.log(`   ✅ Taille acceptable : ${fileSizeMB} MB`);
    validationScore += 20;
    validationPassed.push('Taille fichier OK');
}

// 2. Vérifier l'intégrité du fichier
console.log('\n2️⃣  Intégrité du fichier...');
try {
    if (isVideo) {
        // Utiliser ffprobe pour vérifier la vidéo
        execSync(`ffprobe -v error "${assetPath}"`, { stdio: 'ignore' });
        console.log('   ✅ Vidéo valide (pas de corruption détectée)');
        validationScore += 25;
        validationPassed.push('Fichier non corrompu');
    } else if (isImage) {
        // Vérifier que l'image peut être lue
        const identify = execSync(`identify "${assetPath}"`, { encoding: 'utf8' });
        console.log('   ✅ Image valide');
        validationScore += 25;
        validationPassed.push('Fichier non corrompu');
    }
} catch (e) {
    console.log('   ❌ Fichier corrompu ou illisible');
    validationIssues.push('Fichier corrompu');
}

// 3. Vérifier les specs techniques
console.log('\n3️⃣  Spécifications techniques...');
try {
    if (isVideo) {
        const videoInfo = execSync(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration,r_frame_rate -of csv=p=0 "${assetPath}"`,
            { encoding: 'utf8' }
        ).trim().split(',');

        const width = parseInt(videoInfo[0]);
        const height = parseInt(videoInfo[1]);
        const duration = parseFloat(videoInfo[2]);
        const fps = eval(videoInfo[3]); // Ex: "30/1" → 30

        console.log(`   📐 Résolution : ${width}x${height}`);
        console.log(`   ⏱️  Durée : ${duration.toFixed(1)}s`);
        console.log(`   🎞️  FPS : ${fps}`);

        // Validation résolution
        if (width >= 720 && height >= 1280) {
            console.log('   ✅ Résolution suffisante pour mobile (≥720p)');
            validationScore += 20;
            validationPassed.push('Résolution OK');
        } else {
            console.log('   ⚠️  Résolution faible (< 720p)');
            validationIssues.push('Résolution insuffisante');
        }

        // Validation FPS
        if (fps >= 24) {
            console.log('   ✅ Frame rate acceptable (≥24fps)');
            validationScore += 10;
            validationPassed.push('FPS OK');
        } else {
            console.log('   ⚠️  FPS trop faible');
            validationIssues.push('FPS insuffisant');
        }

        // Validation durée (si applicable)
        if (duration > 0) {
            console.log('   ✅ Durée valide');
            validationScore += 10;
            validationPassed.push('Durée valide');
        }

    } else if (isImage) {
        const imageInfo = execSync(`identify -format "%wx%h" "${assetPath}"`, { encoding: 'utf8' }).trim();
        const [width, height] = imageInfo.split('x').map(n => parseInt(n));

        console.log(`   📐 Résolution : ${width}x${height}`);

        if (width >= 720 && height >= 1280) {
            console.log('   ✅ Résolution suffisante pour mobile');
            validationScore += 30;
            validationPassed.push('Résolution OK');
        } else {
            console.log('   ⚠️  Résolution faible');
            validationIssues.push('Résolution insuffisante');
        }
    }
} catch (e) {
    console.log('   ❌ Impossible d\'extraire les specs techniques');
    validationIssues.push('Specs techniques non lisibles');
}

// 4. Checklist manuelle (nécessite validation humaine)
console.log('\n4️⃣  Checklist de contenu (validation manuelle) :');
console.log('   [ ] Le contenu montre bien le jeu Timalaus ?');
console.log('   [ ] Pas de menus parasites ou bugs visibles ?');
console.log('   [ ] Les événements affichés correspondent à la BDD ?');
console.log('   [ ] Qualité visuelle acceptable (pas de flou, saccades) ?');

if (process.argv.includes('--auto-approve')) {
    console.log('   ✅ Auto-approuvé (mode --auto-approve)');
    validationScore += 15;
    validationPassed.push('Contenu approuvé');
} else {
    console.log('\n   ⚠️  Validation manuelle requise par Lucas');
}

// 5. Résultat final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 SCORE DE VALIDATION : ${validationScore}/100`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (validationPassed.length > 0) {
    console.log('✅ POINTS VALIDÉS :');
    validationPassed.forEach(item => console.log(`   • ${item}`));
    console.log('');
}

if (validationIssues.length > 0) {
    console.log('⚠️  PROBLÈMES DÉTECTÉS :');
    validationIssues.forEach(item => console.log(`   • ${item}`));
    console.log('');
}

// Décision
if (validationScore >= 75) {
    console.log('🟢 DÉCISION LUCAS : Asset APPROUVÉ pour livraison');
    console.log('   Prêt à être livré à K-Hive dans DATA_OUTBOX/TO_K_HIVE/\n');
    process.exit(0);
} else if (validationScore >= 50) {
    console.log('🟡 DÉCISION LUCAS : Asset ACCEPTABLE avec réserves');
    console.log('   Livrable, mais K-Hive devra compenser les faiblesses\n');
    process.exit(0);
} else {
    console.log('🔴 DÉCISION LUCAS : Asset REFUSÉ');
    console.log('   Qualité insuffisante. Tom/Derush doivent refaire la production\n');
    process.exit(1);
}

// Note : Pour une validation encore plus poussée, on pourrait :
// - Utiliser une IA Vision pour vérifier que c'est bien Timalaus
// - Comparer avec des screenshots de référence
// - Détecter automatiquement les bugs visuels (artefacts, glitches)

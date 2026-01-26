const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

/**
 * Lit le rapport de production CHLOE pour extraire les données
 */
function parseProductionReport(videoPath) {
    const reportPath = videoPath.replace('.mp4', '_RAPPORT.md');
    if (!fs.existsSync(reportPath)) return null;

    const content = fs.readFileSync(reportPath, 'utf8');

    // Extraction simple par regex
    const hookMatch = content.match(/- Hook: "(.*)"/);
    const dateMatch = content.match(/- Date: (.*)/);

    return {
        hook: hookMatch ? hookMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null
    };
}

async function publishToTikTok(videoPath, hook, dryRun = false) {
    console.log(`\n🚀 Tentative de publication : ${path.basename(videoPath)}`);

    if (dryRun) {
        console.log(`[DRY-RUN] Hook: ${hook}`);
        console.log(`[DRY-RUN] Simulation de publication réussie.`);
        return { success: true, timestamp: Date.now() };
    }

    if (!fs.existsSync(config.tiktok.session_file)) {
        throw new Error('Fichier de session manquant. Lancez setup_session.js d\'abord.');
    }

    const browser = await chromium.launch({ headless: false }); // Headless false pour voir ce qui se passe
    const context = await browser.newContext({
        storageState: config.tiktok.session_file,
        viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();

    try {
        await page.goto('https://www.tiktok.com/upload?lang=fr');

        // Attendre que l'upload soit prêt (le bouton de sélection de fichier ou l'iframe)
        await page.waitForSelector('input[type="file"]');
        const fileInput = await page.$('input[type="file"]');
        await fileInput.setInputFiles(videoPath);

        console.log('--- Upload en cours... ---');

        // Attendre que la barre de progression disparaisse (le traitement peut être long)
        // Note: TikTok change souvent ses sélecteurs, on essaie d'être robuste
        try {
            await page.waitForSelector('[data-e2e="upload-progress"]', { state: 'hidden', timeout: 180000 });
        } catch (e) {
            console.log('Note: Sélecteur de progression non trouvé ou déjà disparu.');
        }

        // Préparer la légende (caption)
        const hashtags = config.tiktok.default_hashtags.map(h => `#${h}`).join(' ');
        const caption = config.caption_template
            .replace('{hook}', hook)
            .replace('{hashtags}', hashtags);

        // Saisir la légende
        // TikTok utilise souvent un div contenteditable pour la légende
        const captionSelector = '[data-e2e="caption-input"] [contenteditable="true"]';
        await page.waitForSelector(captionSelector);
        await page.fill(captionSelector, ''); // Clear
        await page.fill(captionSelector, caption);

        console.log('Légende saisie.');

        // Attendre un peu pour que TikTok valide les champs
        await page.waitForTimeout(5000);

        // Cliquer sur Publier
        const postButtonSelector = '[data-e2e="post-button"]';
        await page.waitForSelector(postButtonSelector);
        await page.click(postButtonSelector);

        console.log('Bouton Publier cliqué.');

        // Attendre la confirmation (souvent un modal ou redirection)
        await page.waitForTimeout(10000);

        await browser.close();
        return { success: true, timestamp: Date.now() };

    } catch (error) {
        console.error('Erreur pendant la publication Playwright:', error);
        await page.screenshot({ path: path.join(config.storage.logs, `error_${Date.now()}.png`) });
        await browser.close();
        return { success: false, error: error.message };
    }
}

async function run() {
    const dryRun = process.argv.includes('--dry-run');
    const inputDir = path.resolve(__dirname, config.storage.pret_a_publier);
    const outputDir = path.resolve(__dirname, config.storage.published);

    if (!fs.existsSync(inputDir)) {
        console.log(`Dossier d'entrée inexistant : ${inputDir}`);
        return;
    }

    const videos = fs.readdirSync(inputDir).filter(f => f.endsWith('.mp4'));
    console.log(`Vidéos trouvées dans CHLOE/OUTPUT : ${videos.length}`);

    let count = 0;
    for (const videoFile of videos) {
        if (count >= config.tiktok.max_posts_per_run) break;

        const videoPath = path.join(inputDir, videoFile);

        // 1. Tenter de lire le rapport CHLOE
        const report = parseProductionReport(videoPath);

        // 2. Déterminer la légende
        let hook = "Un moment d'histoire incroyable !";
        if (report && report.hook) {
            hook = report.hook;
            console.log(`[EMMA] Rapport trouvé pour ${videoFile}. Hook: "${hook}"`);
        } else {
            console.log(`[EMMA] Aucun rapport pour ${videoFile}. Utilisation du nom ou défaut.`);
            hook = videoFile.replace('.mp4', '').split('_').slice(1).join(' ') || hook;
        }

        const result = await publishToTikTok(videoPath, hook, dryRun);

        if (result.success) {
            if (!dryRun) {
                // Déplacer la vidéo + rapport vers PUBLISHED
                const destPath = path.join(outputDir, videoFile);
                fs.renameSync(videoPath, destPath);

                const reportPath = videoPath.replace('.mp4', '_RAPPORT.md');
                if (fs.existsSync(reportPath)) {
                    fs.renameSync(reportPath, destPath.replace('.mp4', '_RAPPORT.md'));
                }

                // Copie également vers PRÊT_A_PUBLIER (pour info humaine)
                const pretPath = path.resolve(__dirname, config.storage.pret_a_publier, videoFile);
                fs.copyFileSync(destPath, pretPath);

                console.log(`✅ Publié et archivé.`);
            }
            count++;

            if (count < config.tiktok.max_posts_per_run) {
                console.log(`Attente de ${config.tiktok.delay_between_posts_ms / 1000}s avant le prochain post...`);
                await new Promise(r => setTimeout(r, config.tiktok.delay_between_posts_ms));
            }
        } else {
            console.error(`❌ Échec pour ${videoFile}: ${result.error}`);
        }
    }

    console.log(`\nFin du run. Total publiés : ${count}`);
}

if (require.main === module) {
    run().catch(console.error);
}

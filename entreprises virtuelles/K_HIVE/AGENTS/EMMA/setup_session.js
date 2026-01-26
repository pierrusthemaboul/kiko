const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function setupSession() {
    console.log('--- EMMA : CONFIGURATION SESSION TIKTOK ---');
    console.log('Le navigateur va s\'ouvrir dans 3 secondes...');
    await new Promise(r => setTimeout(r, 3000));

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('1. Connectez-vous à votre compte TikTok dans la fenêtre du navigateur.');
    console.log('2. Une fois connecté, revenez ici et appuyez sur Entrée pour sauvegarder la session.');

    await page.goto('https://www.tiktok.com/login');

    // Attendre que l'utilisateur appuie sur entrée dans le terminal
    await new Promise(resolve => {
        process.stdin.resume();
        process.stdin.once('data', resolve);
    });

    const sessionPath = path.join(__dirname, 'tiktok_session.json');
    await context.storageState({ path: sessionPath });

    console.log(`✅ Session sauvegardée dans : ${sessionPath}`);
    console.log('Vous pouvez maintenant fermer le navigateur.');

    await browser.close();
    process.exit(0);
}

setupSession().catch(err => {
    console.error('Erreur lors de la configuration de la session:', err);
    process.exit(1);
});

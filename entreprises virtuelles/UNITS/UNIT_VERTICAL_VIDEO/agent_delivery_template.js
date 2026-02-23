#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Configuration de base pour un agent de distribution (Caption Agent)
const agent_config = {
    "EMMA_TIKTOK": {
        "name": "EMMA",
        "platform": "TikTok",
        "output_path": "../../../PRET_A_PUBLIER/TIKTOK",
        "prompt_style": "court, punchy, avec beaucoup d'hashtags tendances et un appel à l'action direct.",
        "hashtags": ["#Timalaus", "#Histoire", "#Quiz", "#AvantOuApres", "#TikTokGame", "#CultureG"]
    },
    "ZOE_INSTAGRAM": {
        "name": "ZOE",
        "platform": "Instagram Reels",
        "output_path": "../../../PRET_A_PUBLIER/REELS",
        "prompt_style": "esthétique, lifestyle, posant une question de réflexion sur l'événement.",
        "hashtags": ["#Timalaus", "#InstaHistory", "#QuizTime", "#CultureGenerale", "#HistoryReels"]
    },
    "SARAH_FACEBOOK": {
        "name": "SARAH",
        "platform": "Facebook Reels",
        "output_path": "../../../PRET_A_PUBLIER/FB_REELS",
        "prompt_style": "communautaire, convivial, invitant au partage et à la discussion en famille.",
        "hashtags": ["#Timalaus", "#FacebookGamers", "#HistoireDeFrance", "#QuizEnFamille"]
    },
    "CLARA_YOUTUBE": {
        "name": "CLARA",
        "platform": "YouTube Shorts",
        "output_path": "../../../PRET_A_PUBLIER/SHORTS",
        "prompt_style": "informatif, optimisé pour la recherche, utilisant des mots-clés forts.",
        "hashtags": ["#Shorts", "#History", "#Timalaus", "#Educational", "#Quiz"]
    }
};

const AGENT_ID = path.basename(__dirname);
const config = agent_config[AGENT_ID];

if (!config) {
    console.error(`Configuration introuvable pour l'agent ${AGENT_ID}`);
    process.exit(1);
}

// Chemins
const HUB_DIR = path.resolve(__dirname, '../STORAGE/DELIVERY_INPUT');
const TODAY = new Date().toISOString().split('T')[0];
const DEST_DIR = path.resolve(__dirname, config.output_path, TODAY);
const LOGS_DIR = path.resolve(__dirname, './STORAGE/LOGS');
const GAME_BIBLE_PATH = path.resolve(__dirname, '../../../SHARED/GAME_BIBLE.md');

// Charger les variables d'environnement
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const fetch = require('node-fetch');

// Créer les dossiers
[DEST_DIR, LOGS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Charger la Bible
function getGameBible() {
    if (fs.existsSync(GAME_BIBLE_PATH)) return fs.readFileSync(GAME_BIBLE_PATH, 'utf8');
    return "Timalaus: Jeu de quiz historique Avant/Après.";
}

async function generateCaption(videoName, hook) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return `Découvrez Timalaus ! ${hook}`;

    const bible = getGameBible();
    const prompt = `Tu es l'agent ${config.name}, experte en communication pour ${config.platform}.
Ton jeu est Timalaus (voir Bible ci-dessous).

MISSION: Écris la légende parfaite pour une vidéo dont le sujet est : "${hook}".
TON STYLE: ${config.prompt_style}

BIBLE DU JEU:
${bible}

RÈGLES:
- Ne dépasse pas 300 caractères.
- Inclus ces hashtags : ${config.hashtags.join(', ')}
- Termine par un appel à télécharger le jeu sur le Store.
- Réponds UNIQUEMENT avec le texte final de la légende.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    } catch (e) {
        console.error(`[${config.name}] Erreur IA:`, e.message);
        return `${hook} - Jouez à Timalaus ! ${config.hashtags.join(' ')}`;
    }
}

async function run() {
    console.log(`\n[${config.name}] 🚀 Préparation pour ${config.platform}...`);

    if (!fs.existsSync(HUB_DIR)) return;

    const files = fs.readdirSync(HUB_DIR).filter(f => f.endsWith('.mp4'));

    for (const video of files) {
        console.log(`[${config.name}] ✍️ Rédaction pour ${video}`);

        // Lire le hook depuis le rapport
        const reportPath = path.join(HUB_DIR, video.replace('.mp4', '_RAPPORT.md'));
        let hook = video;
        if (fs.existsSync(reportPath)) {
            const content = fs.readFileSync(reportPath, 'utf8');
            const match = content.match(/- Hook: "(.*)"/);
            if (match) hook = match[1];
        }

        const caption = await generateCaption(video, hook);

        // Copier la vidéo vers la destination finale
        fs.copyFileSync(path.join(HUB_DIR, video), path.join(DEST_DIR, video));

        // Créer le fichier de légende
        const captionFile = video.replace('.mp4', '_LEGENDE.txt');
        fs.writeFileSync(path.join(DEST_DIR, captionFile), caption);

        console.log(`[${config.name}] ✅ Prêt dans PRET_A_PUBLIER/`);
    }
}

run().catch(console.error);

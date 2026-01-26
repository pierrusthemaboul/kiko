#!/usr/bin/env node
/**
 * Agent JEAN - Production Twitter
 *
 * Crée des tweets engageants basés sur les événements historiques:
 * 1. Lit les données des clips/événements
 * 2. Génère des tweets avec différents templates
 * 3. Sauvegarde dans PRET_A_PUBLIER/TWITTER
 */

const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Charger les variables d'environnement
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const fetch = require('node-fetch');


// Chemins
const INPUT_DIR = path.resolve(__dirname, config.storage.input);
const OUTPUT_DIR = path.resolve(__dirname, config.storage.output);
const LOGS_DIR = path.resolve(__dirname, config.storage.logs);
const PRET_A_PUBLIER = path.resolve(__dirname, '../../../PRET_A_PUBLIER/TWITTER');

// Créer les dossiers si nécessaire
[INPUT_DIR, OUTPUT_DIR, LOGS_DIR, PRET_A_PUBLIER].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============ LOGGING ============
function log(action, status, detail, reason = "") {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: config.agent_name,
        role: config.role,
        action,
        status,
        detail,
        reason
    };

    const icon = status === 'OK' || status === 'SUCCESS' ? '✅' :
        status === 'FAILED' ? '❌' :
            status === 'PROCESS' ? '⏳' : '📝';
    console.log(`[JEAN/Twitter] ${icon} ${action}: ${detail}`);

    const logFile = path.join(LOGS_DIR, `jean_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    return entry;
}

// ============ IA GENERATION ============
async function generateTweetWithAI(event, maxRetries = 3) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("[JEAN/Twitter] ⚠️ GEMINI_API_KEY non trouvée, fallback vers statique.");
        return null;
    }

    const prompt = `Tu es un community manager pour Timalaus, un jeu de quiz historique "Avant ou Après".

Génère UN tweet engageant (max 250 chars sans hashtags) pour cet événement:
- Titre: ${event.titre}
- Date: ${event.date}
- Description: ${event.description || 'N/A'}

Le tweet doit:
- Être intrigant/mystérieux
- Donner envie de jouer
- Poser une question ou un défi basé sur l'événement

Réponds UNIQUEMENT avec le texte du tweet, sans hashtags.`;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            let tweetText = data.candidates[0].content.parts[0].text.trim();

            // Nettoyage basique (enlever guillemets si l'IA en met)
            tweetText = tweetText.replace(/^"|"$/g, '');

            if (tweetText.length > 5 && tweetText.length < 260) {
                return tweetText;
            }
        } catch (e) {
            console.log(`[JEAN/Twitter] ⚠️ Tentative ${i + 1}/${maxRetries} échouée: ${e.message}`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

// ============ GÉNÉRATION TWEET ============
async function generateTweet(event, type = 'quiz') {
    const year = event.date.split('-')[0];
    const title = event.titre.substring(0, 60);
    const hashtags = config.tweet.default_hashtags.map(h => `#${h}`).join(' ');

    // Essayer l'IA d'abord
    let tweetText = await generateTweetWithAI(event);

    // Fallback statique si l'IA échoue
    if (!tweetText) {
        const appLink = 'https://timalaus.app';
        switch (type) {
            case 'quiz':
                const refYear = parseInt(year) + (Math.random() > 0.5 ? 100 : -100);
                tweetText = `📅 ${year} - ${title}\n\n🤔 Avant ou après ${refYear}?\n\nTeste-toi sur Timalaus! 👇\n${appLink}`;
                break;
            case 'fact':
                const fact = event.description ? event.description.substring(0, 150) : `En ${year}, ${title.toLowerCase()}`;
                tweetText = `💡 Le saviez-vous?\n\n${fact}\n\n🎮 Plus de questions sur Timalaus!\n${appLink}`;
                break;
            case 'challenge':
                tweetText = `🏆 Défi du jour!\n\n${title} - quelle année?\n\nRéponds en commentaire! 👇`;
                break;
            default:
                tweetText = `📚 ${year} - ${title}`;
        }
    }

    const finalTweet = `${tweetText}\n\n${hashtags}`;

    return {
        content: finalTweet,
        length: finalTweet.length,
        type: tweetText.includes('?') ? 'IA_QUIZ' : 'IA_FACT',
        event: {
            titre: event.titre,
            date: event.date,
            notoriete: event.notoriete
        }
    };
}


// ============ MAIN ============
async function run() {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  JEAN - Production Twitter v${config.version}     ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    log("INITIALIZATION", "OK", "Agent JEAN en service");

    // Chercher des données d'événements
    // Option 1: Depuis une sélection MARC
    // Option 2: Depuis un DELIVERY_MANIFEST
    // Option 3: Depuis un fichier d'événements dédié

    let events = [];

    // Chercher sélection MARC
    const selectionFiles = fs.readdirSync(INPUT_DIR).filter(f => f.startsWith('selection_'));
    const manifestFiles = fs.readdirSync(INPUT_DIR).filter(f => f.includes('MANIFEST'));
    const eventFiles = fs.readdirSync(INPUT_DIR).filter(f => f.startsWith('events_'));

    if (selectionFiles.length > 0) {
        const selection = JSON.parse(
            fs.readFileSync(path.join(INPUT_DIR, selectionFiles.sort().reverse()[0]), 'utf8')
        );
        events = selection.clips.map(c => c.evenement);
        log("SOURCE", "OK", `${events.length} événements depuis sélection MARC`);
    } else if (manifestFiles.length > 0) {
        const manifest = JSON.parse(
            fs.readFileSync(path.join(INPUT_DIR, manifestFiles.sort().reverse()[0]), 'utf8')
        );
        events = manifest.clips.map(c => c.evenement);
        log("SOURCE", "OK", `${events.length} événements depuis DELIVERY_MANIFEST`);
    } else if (eventFiles.length > 0) {
        const eventsData = JSON.parse(
            fs.readFileSync(path.join(INPUT_DIR, eventFiles.sort().reverse()[0]), 'utf8')
        );
        events = eventsData.events || eventsData;
        log("SOURCE", "OK", `${events.length} événements depuis fichier dédié`);
    } else {
        log("SOURCE", "FAILED", "Aucune source d'événements trouvée");
        console.log(`\n[JEAN/Twitter] 💡 Pour générer des tweets, placez dans INPUT:`);
        console.log(`         - selection_*.json (depuis MARC)`);
        console.log(`         - *_MANIFEST.json (depuis DERUSH)`);
        console.log(`         - events_*.json (fichier d'événements)`);
        return;
    }

    // Filtrer les événements VIP si possible
    const vipEvents = events.filter(e => (e.notoriete || 0) > 80);
    const sourceEvents = vipEvents.length > 0 ? vipEvents : events.slice(0, 5);

    log("FILTER", "OK", `${sourceEvents.length} événements à traiter`);

    // Générer des tweets
    const tweets = [];
    const tweetTypes = ['quiz', 'fact', 'challenge'];

    for (let i = 0; i < sourceEvents.length; i++) {
        const event = sourceEvents[i];
        const type = tweetTypes[i % tweetTypes.length];

        console.log(`\n[JEAN/Twitter] 🐦 Tweet ${i + 1}/${sourceEvents.length}`);
        console.log(`         Événement: ${event.titre.substring(0, 40)}...`);
        console.log(`         Type: ${type}`);

        const tweet = await generateTweet(event, type);

        tweets.push(tweet);

        log("GENERATE", "OK", `Tweet ${type}: ${tweet.length} caractères`);

        // Afficher le tweet
        console.log(`         ────────────────────`);
        tweet.content.split('\n').forEach(line => {
            console.log(`         ${line}`);
        });
        console.log(`         ────────────────────`);
    }

    // Sauvegarder les tweets
    const timestamp = Date.now();

    for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];
        const filename = `tweet_${timestamp}_${i + 1}_${tweet.type}.json`;

        // Sauvegarder dans OUTPUT
        fs.writeFileSync(
            path.join(OUTPUT_DIR, filename),
            JSON.stringify(tweet, null, 2)
        );

        // Copier dans PRET_A_PUBLIER
        fs.writeFileSync(
            path.join(PRET_A_PUBLIER, filename),
            JSON.stringify(tweet, null, 2)
        );
    }

    log("EXPORT", "SUCCESS", `${tweets.length} tweets sauvegardés`);

    // Résumé final
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Résultat                              ║`);
    console.log(`╚════════════════════════════════════════╝\n`);

    console.log(`[JEAN/Twitter] 🐦 ${tweets.length} tweets générés`);
    tweets.forEach((t, i) => {
        console.log(`         ${i + 1}. ${t.type} - ${t.event.titre.substring(0, 30)}... (${t.length} chars)`);
    });

    console.log(`\n[JEAN/Twitter] 📁 Tweets prêts: ${PRET_A_PUBLIER}`);

    log("FINALIZATION", "SUCCESS", `${tweets.length} tweets prêts à publier`);
    console.log(`\n[JEAN/Twitter] ✅ Production terminée.\n`);
}

run().catch(e => {
    log("ERROR", "FAILED", e.message);
    process.exit(1);
});

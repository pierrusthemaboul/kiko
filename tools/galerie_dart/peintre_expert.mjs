import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// --- CONFIGURATION ---
const DEBUG_GENERATION = true;
const PIPELINE_VERSION = "5.5";

// --- INITIALISATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!GEMINI_API_KEY || !REPLICATE_API_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Erreur : Variables d'environnement manquantes.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EVENTS_FILE = path.join(__dirname, 'isolated_events.json');
const ART_SCHOOL_FILE = path.join(__dirname, 'ecole_d_art.md');
const ARCHIVISTE_FILE = path.join(__dirname, 'archiviste.md');

// --- UTILS ---
function getFormattedDate() {
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}_${HH}-${mm}`;
}

function cleanFileName(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);
}

function extractFromReport(report, key) {
    // Supporte "Key :", "**Key** :", "- **Key** :"
    const regex = new RegExp(`(?:\\*\\*)?${key}(?:\\*\\*)?\\s*:\\s*(.*)`, 'i');
    const match = report.match(regex);
    if (match && match[1]) {
        return match[1].trim();
    }
    return "";
}

function getRandomCameraDistance() {
    const r = Math.random();
    if (r < 0.15) return "macro";
    if (r < 0.45) return "close";
    if (r < 0.75) return "medium";
    if (r < 0.95) return "wide";
    return "aerial";
}

function getRandomCompositionType() {
    const types = ["crowd_scene", "object_focus", "symbolic_scene", "architectural_view", "dramatic_moment", "aftermath_scene", "technical_detail"];
    return types[Math.floor(Math.random() * types.length)];
}

function getVisualPriority(title) {
    const iconicKeywords = [/spoutnik/i, /sputnik/i, /gutenberg/i, /voyager/i, /télégraphe/i, /telegraph/i, /locomotive/i, /rover/i, /presse à imprimer/i, /apollo/i, /saturn v/i, /caravelle/i, /moteur à vapeur/i, /marconi/i];
    const adminKeywords = [/organisation/i, /convention/i, /traité/i, /accord/i, /pacte/i, /union/i, /fondation/i, /création de l'/i, /olympique/i, /sport/i, /cio/i, /fifa/i];
    const archKeywords = [/building/i, /bâtiment/i, /gratte-ciel/i, /skyscraper/i, /tour/i, /inauguration/i, /monument/i];
    const socialKeywords = [/loi/i, /réforme/i, /droit/i, /veil/i, /liberté/i, /vote/i, /mouvement social/i, /manifestation/i, /abolition/i];
    const medicalKeywords = [/infirmière/i, /nursing/i, /nightingale/i, /hôpital/i, /hospital/i, /médecine/i, /soin/i, /soignante/i];
    const scienceKeywords = [/radio/i, /liaison/i, /marconi/i, /découverte/i, /science/i, /laboratoire/i, /expérimentation/i, /électrique/i, /télégraphe/i];
    const envKeywords = [/cites/i, /faune/i, /flore/i, /espèces/i, /sauvage/i, /wildlife/i, /environnement/i, /nature/i, /animal/i];
    const movieKeywords = [/film/i, /cinéma/i, /movie/i, /sortie/i, /première/i, /avant-première/i, /théâtre/i];
    const scandalKeywords = [/scandale/i, /dieselgate/i, /fraude/i, /manipulation/i, /émissions/i, /faillite/i, /crash/i];

    if (iconicKeywords.some(kw => kw.test(title))) return "iconic_object";
    if (adminKeywords.some(kw => kw.test(title))) return "symbolic_scene";
    if (archKeywords.some(kw => kw.test(title))) return "iconic_object";
    if (socialKeywords.some(kw => kw.test(title))) return "human_scene";
    if (medicalKeywords.some(kw => kw.test(title))) return "human_scene";
    if (scienceKeywords.some(kw => kw.test(title))) return "technical_scene";
    if (envKeywords.some(kw => kw.test(title))) return "symbolic_scene";
    if (movieKeywords.some(kw => kw.test(title))) return "symbolic_scene";
    if (scandalKeywords.some(kw => kw.test(title))) return "technical_scene";
    return null;
}

async function fetchWikipediaPage(title) {
    const formattedTitle = encodeURIComponent(title).replace(/'/g, "%27");
    let url = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${formattedTitle}&format=json`;
    try {
        let response = await fetch(url, { headers: { 'User-Agent': 'KikoExpert/1.0' } });
        let data = await response.json();
        let pages = data.query.pages;
        let pageId = Object.keys(pages)[0];

        if (pageId === "-1") {
            url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${formattedTitle}&format=json`;
            response = await fetch(url, { headers: { 'User-Agent': 'KikoExpert/1.0' } });
            data = await response.json();
            pages = data.query.pages;
            pageId = Object.keys(pages)[0];
        }

        if (pageId === "-1") return null;
        return pages[pageId].extract;
    } catch (e) {
        return null;
    }
}

// --- PIPELINE ---
async function startGalery() {
    console.log(`🏛️  Bienvenue à l'École d'Art Timalaus - Système Expert v${PIPELINE_VERSION}`);

    const ecoleArtRules = fs.readFileSync(ART_SCHOOL_FILE, 'utf-8');
    const archivisteRules = fs.readFileSync(ARCHIVISTE_FILE, 'utf-8');
    const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));

    // --- SETUP GÉNÉRATION LOCALE ---
    const timestamp = getFormattedDate();
    const genRoot = path.join(__dirname, 'generations', timestamp);
    const imagesDir = path.join(genRoot, 'images');
    const logsDir = path.join(genRoot, 'logs');
    const metadataDir = path.join(genRoot, 'metadata');

    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });
    fs.mkdirSync(metadataDir, { recursive: true });

    const sessionData = {
        generation_date: new Date().toISOString(),
        number_of_events: events.length,
        image_model: "black-forest-labs/flux-schnell",
        pipeline_version: PIPELINE_VERSION,
        events: []
    };

    const archivisteModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: archivisteRules
    });

    const peintreModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `Tu es le Grand Maître de l'École d'Art Timalaus. 
        Ta mission : créer une illustration "Plaisir" pour FLUX SCHNELL.
        
        DOCTRINE DE L'ÉCOLE (ecole_d_art.md) :
        ${ecoleArtRules}
        
        CONSIGNES DE SCANNABILITÉ CRITIQUES :
        1. "single dominant subject occupying at least 40% of the frame"
        2. "Impact Humain" : Pour les lois et scènes médicales.
        3. "Authenticité Historique & Scientifique" : Pas d'anachronismes.
        4. "Événements Culturels" : Symbole de l'œuvre, respect du Copyright.
        5. "Scandales Industriels" : Preuve technique de la fraude.
        6. "Métamorphose Administrative/Environnementale/Sportive" : Illustrer le Domaine.
        7. "Architecture Héroïque" : Cadrage héroïque (contre-plongée).
        8. "Interdiction des Scènes Génériques" : Indice Unique obligatoire.
        9. "Zéro Date/Année" : Interdiction absolue de date ou année.
        
        Prompt Technique Final pour Flux :
           - Commencer par type de scène et distance.
           - Inclure : "single dominant subject occupying 40 percent of frame".
           - Finir par : "full color, vibrant colors, cinematic lighting, high contrast lighting, sharp focus, dramatic composition, historically accurate materials, unbranded equipment, no text, no numbers, no logos, no watermark, decorative text allowed but no visible date or year".`
    });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const eventCode = cleanFileName(event.titre);
        console.log(`\n--- [${i + 1}/${events.length}] ${event.titre} ---`);

        try {
            // Archiviste
            let archivisteReport = "Aucun détail Wikipedia. Use general knowledge.";
            try {
                const suggestRequest = `Événement : ${event.titre}\nSuggère UNIQUEMENT le titre exact de la page Wikipedia.`;
                const suggestResult = await archivisteModel.generateContent(suggestRequest);
                const suggestedTitle = suggestResult.response.text().trim().replace(/^"|"$/g, '');
                const wikiContent = await fetchWikipediaPage(suggestedTitle);
                if (wikiContent) {
                    const archResult = await archivisteModel.generateContent(`Événement : ${event.titre}\n\nARCHIVES :\n${wikiContent.substring(0, 30000)}`);
                    archivisteReport = archResult.response.text();
                }
            } catch (e) {
                console.warn(`      ⚠️ Échec Archiviste pour ${event.titre}: ${e.message}`);
            }

            // Peintre
            const camDist = getRandomCameraDistance();
            const compType = getRandomCompositionType();
            const forcedPriority = getVisualPriority(event.titre);

            if (DEBUG_GENERATION) {
                console.log(`   [DEBUG] Archetype: ${extractFromReport(archivisteReport, "Archetype")}`);
                console.log(`   [DEBUG] Moment: ${extractFromReport(archivisteReport, "Moment_critique")}`);
            }

            let paintingConstraints = `camera_distance: ${camDist}\ncomposition_type: ${compType}`;
            if (forcedPriority === "iconic_object") paintingConstraints += `\nvisual_priority_type: iconic_object`;
            else if (forcedPriority === "symbolic_scene") paintingConstraints += `\nvisual_priority_type: symbolic_scene`;
            else if (forcedPriority === "human_scene") paintingConstraints += `\nvisual_priority_type: human_scene`;
            else if (forcedPriority === "technical_scene") paintingConstraints += `\nvisual_priority_type: technical_scene`;

            let fluxPrompt;
            try {
                const paintingQuery = `RAPPORT DE L'ARCHIVISTE :\n${archivisteReport}\n\n${paintingConstraints}\n\nÉvénement cible : ${event.titre} (${event.date})\n\nTu DOIS détailler ta réflexion artistique puis terminer par le prompt final pour FLUX SCHNELL strictement entouré par les balises <prompt> et </prompt>.`;
                const result = await peintreModel.generateContent(paintingQuery);
                const responseText = result.response.text();

                const promptMatch = responseText.match(/<prompt>([\s\S]*?)<\/prompt>/i);
                fluxPrompt = promptMatch ? promptMatch[1].trim() : null;

                if (!fluxPrompt && DEBUG_GENERATION) {
                    console.log("   [DEBUG] Réponse complète du Peintre (ECHEC PARSING) :");
                    console.log(responseText);
                }

                if (!fluxPrompt) throw new Error("Balise <prompt> manquante ou vide dans la réponse.");
            } catch (e) {
                throw new Error(`Échec Peintre: ${e.message}`);
            }

            if (DEBUG_GENERATION) console.log(`   [DEBUG] Prompt: ${fluxPrompt.substring(0, 100)}...`);

            // Image
            console.log("   🖌️ Génération via Replicate...");
            const startTime = Date.now();
            let tempUrl;
            try {
                const ReplicateOutput = await replicate.run("black-forest-labs/flux-schnell", {
                    input: { prompt: fluxPrompt, aspect_ratio: "16:9", num_inference_steps: 4, guidance_scale: 3 }
                });
                tempUrl = Array.isArray(ReplicateOutput) ? ReplicateOutput[0] : ReplicateOutput;
            } catch (e) {
                throw new Error(`Échec Replicate: ${e.message}`);
            }
            const generationTime = Date.now() - startTime;

            if (!tempUrl) throw new Error("Replicate n'a pas renvoyé d'URL.");

            // Download & Save
            console.log("   ⚙️  Traitement local...");
            let optimizedBuffer;
            try {
                const imageResponse = await fetch(tempUrl);
                if (!imageResponse.ok) throw new Error(`HTTP ${imageResponse.status}`);
                const arrayBuffer = await imageResponse.arrayBuffer();
                optimizedBuffer = await sharp(Buffer.from(arrayBuffer))
                    .resize(1024, 576, { fit: 'cover' })
                    .png()
                    .toBuffer();
            } catch (e) {
                throw new Error(`Échec traitement image: ${e.message}`);
            }

            const imageFileName = `event_${eventCode}_01.png`;
            const imagePath = path.join(imagesDir, imageFileName);
            fs.writeFileSync(imagePath, optimizedBuffer);
            if (DEBUG_GENERATION) console.log(`   [DEBUG] Sauvegardé: ${imagePath}`);

            // Logs
            const eventLog = {
                event_title: event.titre,
                event_date: event.date,
                archetype: extractFromReport(archivisteReport, "Archetype"),
                moment_critique: extractFromReport(archivisteReport, "Moment_critique"),
                objets: (extractFromReport(archivisteReport, "Objets") || "").split(',').map(s => s.trim()).filter(Boolean),
                textures: (extractFromReport(archivisteReport, "Textures") || "").split(',').map(s => s.trim()).filter(Boolean),
                alertes: (extractFromReport(archivisteReport, "Alertes") || "").split(',').map(s => s.trim()).filter(Boolean),
                final_prompt: fluxPrompt,
                image_model: "black-forest-labs/flux-schnell",
                generation_time_ms: generationTime,
                image_file: imageFileName
            };
            fs.writeFileSync(path.join(logsDir, `event_${eventCode}.json`), JSON.stringify(eventLog, null, 2));

            sessionData.events.push({
                code: eventCode,
                title: event.titre,
                image_file: imageFileName,
                archetype: eventLog.archetype
            });

        } catch (err) {
            console.error(`   ❌ ERREUR pour ${event.titre}:`, err.message);
        }
    }

    fs.writeFileSync(path.join(metadataDir, 'session.json'), JSON.stringify(sessionData, null, 2));
    console.log(`\n🎉 Terminé. Dossier: ${genRoot}`);
}

startGalery().catch(err => {
    console.error("❌ ERREUR FATALE DU PIPELINE :", err);
    process.exit(1);
});


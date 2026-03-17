import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import sharp from 'sharp';

// --- CONFIGURATION ---
const DEBUG_GENERATION = true;
const PIPELINE_VERSION = "6.0-REPLACE-AUDIT";

// --- INITIALISATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!GEMINI_API_KEY || !REPLICATE_API_TOKEN) {
    console.error("❌ Variables d'environnement manquantes.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

const EVENTS_FILE = path.join(__dirname, 'isolated_events.json');
const ART_SCHOOL_FILE = path.join(__dirname, 'ecole_d_art.md');
const ARCHIVISTE_FILE = path.join(__dirname, 'archiviste.md');

// --- UTILS ---
function cleanFileName(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').substring(0, 50);
}

async function fetchWikipediaPage(title) {
    const formattedTitle = encodeURIComponent(title).replace(/'/g, "%27");
    let url = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${formattedTitle}&format=json`;
    try {
        let response = await fetch(url, { headers: { 'User-Agent': 'KikoExpert/1.0' } });
        let data = await response.json();
        let pageId = Object.keys(data.query.pages)[0];
        if (pageId === "-1") return null;
        return data.query.pages[pageId].extract;
    } catch (e) { return null; }
}

async function auditImage(base64Data, mimeType, titre, rules, verdictPrecedent) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Tu es l'Expert Qualité de l'École d'Art Timalaus. 
    Tu dois noter l'image qui vient d'être générée pour : "${titre}".
    L'image précédente avait été REJETÉE pour cette raison : "${verdictPrecedent}".
    
    RÈGLES :
    ${rules}
    
    Donne un score sur 10 pour :
    - scannability (identification < 1s)
    - dominance (sujet > 40%)
    - ecole_d_art_compliance (respect des métaphores, pas de foules, pas de logos)
    
    Retourne UNIQUEMENT du JSON :
    { "score_final": 0-10, "scannability": 0-10, "dominance": 0-10, "compliance": 0-10, "critique": "en français" }`;

    try {
        const result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: mimeType } }]);
        return JSON.parse(result.response.text().replace(/```json|```/gi, '').trim());
    } catch (e) { return { error: e.message }; }
}

async function startTestReplace() {
    console.log(`🚀 Pipeline de Test "REPLACE" v${PIPELINE_VERSION}`);
    
    const ecoleArtRules = fs.readFileSync(ART_SCHOOL_FILE, 'utf-8');
    const archivisteRules = fs.readFileSync(ARCHIVISTE_FILE, 'utf-8');
    const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    
    // On récupère les raisons de rejet du fichier clean pour guider le peintre
    const cleanData = JSON.parse(fs.readFileSync(path.join(__dirname, 'visual_reference_dataset_clean.json'), 'utf-8'));
    const rejectionMap = {};
    Object.values(cleanData).flat().forEach(item => { rejectionMap[item.id] = item.validation_ref; });

    const outputDir = path.join(__dirname, 'test_replace');
    const imagesDir = path.join(outputDir, 'images');
    const logsDir = path.join(outputDir, 'logs');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });

    const archivisteModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: archivisteRules });
    const peintreModel = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
        systemInstruction: `Tu es le Grand Maître de l'École d'Art. Tu dois CORRIGER des images rejetées.
        RÈGLES : ${ecoleArtRules}
        CONSIGNE CRITIQUE : L'image doit avoir un UNIQUE SUJET DOMINANT (>40%). BANNIR LES FOULES ET RÉUNIONS.` 
    });

    for (const event of events) {
        const eventCode = cleanFileName(event.titre);
        const verdictPrecedent = rejectionMap[event.id] || "Image générique rejetée par l'audit.";
        console.log(`\n💎 Traitement : ${event.titre}`);

        try {
            // 1. Archiviste
            const wiki = await fetchWikipediaPage(event.titre);
            const archResult = await archivisteModel.generateContent(`Événement : ${event.titre}\nArchives : ${wiki?.substring(0, 10000) || "N/A"}`);
            const archivisteReport = archResult.response.text();

            // 2. Peintre
            const paintingQuery = `RAPPORT ARCHIVISTE : ${archivisteReport}\n\nPOURQUOI L'IMAGE PRÉCÉDENTE A ÉCHOUÉ : ${verdictPrecedent}\n\nMISSION : Crée un NOUVEAU PROMPT Flux Schnell pour corriger ces défauts. Sois radicalement différent. Entoure le prompt par <prompt></prompt>.`;
            const peintreResult = await peintreModel.generateContent(paintingQuery);
            const fluxPrompt = peintreResult.response.text().match(/<prompt>([\s\S]*?)<\/prompt>/i)?.[1].trim();

            if (!fluxPrompt) throw new Error("Prompt non généré.");

            // 3. Flux
            console.log("   🎨 Flux travaille...");
            const output = await replicate.run("black-forest-labs/flux-schnell", { input: { prompt: fluxPrompt, aspect_ratio: "16:9" } });
            const imageUrl = Array.isArray(output) ? output[0] : output;

            // 4. Download & Sharp
            const imgRes = await fetch(imageUrl);
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            const optimized = await sharp(buffer).resize(1024, 576).png().toBuffer();
            const fileName = `${eventCode}.png`;
            fs.writeFileSync(path.join(imagesDir, fileName), optimized);

            // 5. AGENT AUDIT (NOUVEAU)
            console.log("   ⚖️  Audit de la nouvelle image...");
            const audit = await auditImage(optimized.toString('base64'), 'image/png', event.titre, ecoleArtRules, verdictPrecedent);

            // 6. Logs complets
            const finalLog = {
                titre: event.titre,
                raison_echec_precedente: verdictPrecedent,
                archiviste: archivisteReport,
                prompt_genere: fluxPrompt,
                audit_nouvelle_image: audit
            };
            fs.writeFileSync(path.join(logsDir, `${eventCode}.json`), JSON.stringify(finalLog, null, 2));
            console.log(`   ✅ Score : ${audit.score_final}/10 - ${audit.critique.substring(0, 60)}...`);

        } catch (e) { console.error(`   ❌ Erreur : ${e.message}`); }
    }
}

startTestReplace();


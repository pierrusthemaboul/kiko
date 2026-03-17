import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prodDb = createClient(PROD_URL, PROD_KEY);

const REPORT_FILE = path.join(__dirname, 'audit_vision_report.json');

function loadReport() {
    if (fs.existsSync(REPORT_FILE)) return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
    return { flaggedEvents: [], checkedIds: [] };
}
function saveReport(report) {
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
}

async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 30000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.status === 429) {
                console.warn(`⏳ [HTTP 429] Rate Limit... Attente de ${6 * attempt}s`);
                await new Promise(r => setTimeout(r, 6000 * attempt));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP Error: ${res.statusText}`);
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt === maxRetries) throw err;
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

async function getImageAsBase64(url) {
    try {
        const response = await fetchWithRetry(url, {}, 2, 15000);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return { base64, mimeType };
    } catch (err) {
        console.error(`Impossible de télécharger l'image depuis ${url}:`, err.message);
        return null;
    }
}

async function checkImageVision(titre, imageUrl) {
    const imageData = await getImageAsBase64(imageUrl);
    if (!imageData) return { isOk: true }; // On ignore si l'image est indisponible

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Voici l'illustration associée à l'événement historique : "${titre}".
Tu dois analyser cette image pour un jeu vidéo grand public et repérer DEUX problèmes graves :

1. DROIT D'AUTEUR CONTEMPORAIN : S'agit-il d'une représentation photoréaliste d'une œuvre contemporaine ultra-protégée en Europe (ex: La Tour Eiffel illuminée DE NUIT, la Pyramide du Louvre, l'Atomium, des logos visibles très récents, des personnages sous licence comme Mickey, Superman, Pokémons) ou du visage reconnaissable et tragique d'un acteur récent ? Si la représentation est une abstraction peinte, vague ou très stylisée, c'est OK. Si c'est trop photoréaliste et protégé, lève le drapeau.

2. TONALITÉ MORBIDE OU CHOQUANTE : L'image contient-elle des éléments graphiques tristes ou "gore" inadaptés (cercueils, personnes en pleurs, cadavres, violence très réaliste) ? Une peinture abstraite d'une bataille est OK, mais la photo lugubre de la mort d'un artiste n'est pas OK.

Formule ta réponse STRICTEMENT en JSON :
{
  "is_problematic": true ou false,
  "reasons": "Si true, explique brièvement pourquoi (soit Droit d'auteur, soit Morbide). Si false, mets une chaîne vide."
}`;

    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: imageData.mimeType,
                                data: imageData.base64
                            }
                        }
                    ]
                }
            ],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
    }, 3, 20000);

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Réponse vide Gemini");

    try {
        const parsed = JSON.parse(text);
        // isOk est FALSE si c'est problematique
        return { isOk: !parsed.is_problematic, reasons: parsed.reasons };
    } catch (e) {
        console.error("Erreur parsing JSON Gemini Vision:", e.message, text);
        return { isOk: true };
    }
}

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
}

async function runVisionAudit() {
    console.log("==================================================");
    console.log("   👁️  DÉMARRAGE DE L'AUDIT VISION (IMAGES) - KIKO ");
    console.log("==================================================\n");

    const report = loadReport();

    console.log("📥 Récupération des événements de moins de 130 ans...");
    // 1900 environ

    let allEvents = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await prodDb.from('evenements')
            .select('id, titre, date, illustration_url')
            .gte('date', '1900-01-01')
            .not('illustration_url', 'is', null)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        page++;
    }

    console.log(`🖼️  ${allEvents.length} événements avec image trouvés.`);

    const eventsToCheck = allEvents.filter(e => !report.checkedIds.includes(e.id));
    console.log(`🔍 Il reste ${eventsToCheck.length} images à scanner.\n`);

    const batches = chunkArray(eventsToCheck, 3); // petits batchs car les images pèsent lourd

    let batchIndex = 1;
    for (const batch of batches) {
        console.log(`⏳ Scan Vision lot ${batchIndex}/${batches.length}...`);

        await Promise.all(batch.map(async (event) => {
            try {
                const result = await checkImageVision(event.titre, event.illustration_url);
                if (!result.isOk) {
                    console.log(`  🚩 [IMAGE SIGNALÉE] : "${event.titre}" - Motif: ${result.reasons}`);
                    report.flaggedEvents.push({
                        id: event.id,
                        titre: event.titre,
                        url: event.illustration_url,
                        reasons: result.reasons
                    });
                }
                report.checkedIds.push(event.id);
            } catch (err) {
                console.error(`Erreur sur l'image ${event.id}: ${err.message}`);
            }
        }));

        saveReport(report);
        batchIndex++;
        // Pause pour l'API Google
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("\n🎉 AUDIT VISION TERMINÉ ! Les résultats sont dans audit_vision_report.json");
}

runVisionAudit();


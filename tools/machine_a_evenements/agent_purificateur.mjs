// Fichier global de l'Agent d'Audit (Texte & Vision) pour la base existante (> 1900)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Client PROD (Lecture seule des données)
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prodDb = createClient(PROD_URL, PROD_KEY);

// Client LOCAL (Écriture des rapports)
const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

// Gestion Sauvegarde
const STATE_FILE = path.join(__dirname, 'agent_purificateur_state.json');
function loadState() {
    if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    return { auditedIds: [] };
}
function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Fetch Securisé API
async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 30000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.status === 429) {
                console.warn(`⏳ [HTTP 429] Attente API de ${6 * attempt}s...`);
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

// ------------------------------------------------------------
// ⚖️ AGENT GPT-4o-mini : AUDIT ÉTHIQUE ET TITRE (AMBIGUÏTÉ)
// ------------------------------------------------------------
async function checkTextAmbiguity(titre) {
    const apiKey = process.env.OPENAI_API_KEY;
    const prompt = `Tu es l'arbitre intraitable d'un jeu de culture générale français où les dates sont masquées.
Titre de la carte : "${titre}".

Vérifie DEUX CHOSES ABSOLUES :
1. AMBIGUÏTÉ : Sans voir l'année, ce titre pourrait-il s'appliquer à PLUSIEURS occurrences dans l'Histoire ?
   (Ex: "Émeutes en banlieue", "Crue de la Seine", "Séisme meurtrier") -> ÉCHOUENT car trop vagues.
   (Ex: "Crue centennale de la Seine", "Chute du mur de Berlin") -> RÉUSSISSENT car uniques.
   
2. DÉONTOLOGIE ET TONALITÉ : Le titre aborde-t-il des sujets de trauma absolu, des génocides (Holocauste), la torture, ou le meurtre tragique de civils/victimes privées ? (ex: "Rafle de...", "Suicide de...", "Assassinat de [personne civile]"). 

RÉPONSE ATTENDUE EN JSON :
{
  "is_ok": true/false (false si flou ou problématique éthiquement),
  "reason": "Explication très brève si false"
}`;

    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        })
    });
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content.trim());
}

// ------------------------------------------------------------
// 👁️ AGENT GEMINI 2.5 FLASH : AUDIT VISION (IMAGE)
// ------------------------------------------------------------
async function getImageAsBase64(url) {
    try {
        const response = await fetchWithRetry(url, {}, 2, 10000);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return { base64: buffer.toString('base64'), mimeType: response.headers.get('content-type') || 'image/jpeg' };
    } catch { return null; }
}

async function checkImageVision(titre, imageUrl) {
    const imageData = await getImageAsBase64(imageUrl);
    if (!imageData) return { is_ok: true, reason: "" }; // Image manquante

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Voici l'illustration associée à l'événement : "${titre}".
Analyse l'image pour un jeu vidéo et soulève un drapeau rouge (is_ok: false) SI SEULEMENT SI :

1. DROIT D'AUTEUR : L'image est une photographie pure ou une représentation photoréaliste parfaite d'une œuvre contemporaine protégée (Tour Eiffel illuminée DE NUIT, Pyramide du Louvre, Atomium, Visage d'acteur célèbre). (Si c'est un dessin stylisé, abstrait ou une peinture, c'est acceptable = true).
2. TONALITÉ MORBIDE : L'image contient clairement des cercueils, cadavres, larmes de deuil réalistes.

RÉPONSE ATTENDUE EN JSON :
{
  "is_ok": true ou false,
  "reason": "Si false, explique brièvement pourquoi."
}`;

    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }, { inlineData: { mimeType: imageData.mimeType, data: imageData.base64 } }]
            }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
    }, 3, 20000);

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { is_ok: true, reason: "" };

    return JSON.parse(text);
}


function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
}

// ------------------------------------------------------------
// 🚀 ORCHESTRATEUR DE PURIFICATION
// ------------------------------------------------------------
async function runPurificator() {
    console.log("======================================================");
    console.log("  🧹 DÉMARRAGE DE L'AGENT PURIFICATEUR (> 1900)");
    console.log("======================================================\n");

    const state = loadState();

    console.log("📥 Lecture de la Production (Cartes post-1900)...");
    let allEvents = [];
    let page = 0;
    while (true) {
        const { data, error } = await prodDb.from('evenements')
            .select('id, titre, date, illustration_url')
            .gte('date', '1900-01-01') // Filtre des événements > 1900
            .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        page++;
    }

    const eventsToCheck = allEvents.filter(e => !state.auditedIds.includes(e.id));
    console.log(`📊 Total : ${allEvents.length} événements. Reste à auditer : ${eventsToCheck.length}\n`);

    const batches = chunkArray(eventsToCheck, 5); // Lots de 5
    let batchIndex = 1;

    for (const batch of batches) {
        console.log(`\n⏳ Scan combiné (Texte + Image) lot ${batchIndex}/${batches.length}...`);

        const resultsToInsert = [];

        await Promise.all(batch.map(async (event) => {
            const dateStr = event.date ? event.date.substring(0, 4) : "inconnue";

            // 1. Audit du Titre (GPT)
            const textReport = await checkTextAmbiguity(event.titre);
            if (!textReport.is_ok) {
                console.log(`  ❌ [TITRE]   : "${event.titre}" -> ${textReport.reason}`);
                resultsToInsert.push({ evenement_id: event.id, titre: event.titre, annee: Number(dateStr), type_audit: 'TEXTE_FLOU_ETHIQUE', is_problematic: true, raisons: textReport.reason });
            }

            // 2. Audit de l'Image (Gemini)
            if (event.illustration_url) {
                const visionReport = await checkImageVision(event.titre, event.illustration_url);
                if (!visionReport.is_ok) {
                    console.log(`  👁️ [IMAGE]   : "${event.titre}" -> ${visionReport.reason}`);
                    resultsToInsert.push({ evenement_id: event.id, titre: event.titre, annee: Number(dateStr), type_audit: 'VISION_DROIT_ETHIQUE', is_problematic: true, raisons: visionReport.reason });
                }
            }

            state.auditedIds.push(event.id);
        }));

        // Envoi des anomalies détectées dans la table locale 'audit_reports'
        if (resultsToInsert.length > 0) {
            const { error: insertErr } = await localDb.from('audit_reports').insert(resultsToInsert);
            if (insertErr) console.error("Erreur insertion locale du rapport :", insertErr.message);
        }

        saveState(state);
        batchIndex++;
    }

    console.log("\n🎉 PURIFICATION TERMINÉE. Résultats disponibles dans la table locale 'audit_reports'.");
}

runPurificator();


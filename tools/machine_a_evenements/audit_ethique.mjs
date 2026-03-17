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

const REPORT_FILE = path.join(__dirname, 'audit_ethique_report.json');

function loadReport() {
    if (fs.existsSync(REPORT_FILE)) return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
    return { flaggedEvents: [], checkedIds: [] };
}
function saveReport(report) {
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
}

// Fonction utilitaire de Fetch Sécurisé 
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
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

async function checkAmbiguity(titre) {
    const apiKey = process.env.OPENAI_API_KEY;
    const prompt = `Tu es l'arbitre intraitable d'un jeu de culture générale français où toutes les dates sont masquées.
Le joueur va lire ce titre de carte EXACTEMENT comme ceci : "${titre}".

Ta mission est de vérifier DEUX CHOSES ABSOLUES :
1. AMBIGUÏTÉ (Règle d'or) : Sans voir l'année, ce titre pourrait-il s'appliquer à PLUSIEURS occurrences différentes dans l'Histoire ?
   (Exemples qui ÉCHOUENT car trop vagues : "Émeutes en banlieue", "Crue de la Seine", "Élection présidentielle", "Guerre Civile", "Séisme meurtrier").
   (Exemples qui RÉUSSISSENT car uniques : "Crue centennale de la Seine", "Premier vol du Concorde", "Chute du mur de Berlin").
   
2. DÉONTOLOGIE ET TONALITÉ : Le jeu doit rester un divertissement intellectuel. Le titre aborde-t-il des sujets de trauma absolu, des génocides (notamment la Shoah / l'Holocauste), la torture systémique, ou le meurtre tragique de civils/enfants/personnes privées ? (ex: "Début de la rafle du Vel' d'Hiv", "L'ouverture du camp d'Auschwitz", "Assassinat de...", "Suicide de...", "Mort de [Personne non-historique majeure]"). Si oui, c'est injouable éthiquement et cela casse le ton du jeu.

RÉPONSE ATTENDUE :
Réponds UNIQUEMENT par "OUI" si le titre représente de façon indéniable UN SEUL événement historique extrêmement précis et jouable déontologiquement.
Réponds UNIQUEMENT par "NON" si le titre est répétitif, vague, ou s'il aborde la Shoah, un génocide, ou un drame privé/traumatique inapproprié pour un jeu de société.`;

    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        })
    });
    const data = await res.json();
    return data.choices[0].message.content.trim().toUpperCase().includes("OUI");
}

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
    return chunks;
}

async function runAudit() {
    console.log("==================================================");
    console.log("   ⚖️  DÉMARRAGE DE L'AUDIT ÉTHIQUE (TEXTE) - KIKO ");
    console.log("==================================================\n");

    const report = loadReport();

    console.log("📥 Récupération de tous les événements de la table de production...");

    // Fetch paginé pour éviter les crash de mémoire
    let allEvents = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
        const { data, error } = await prodDb.from('evenements').select('id, titre, date_formatee').range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        page++;
    }

    console.log(`📊 ${allEvents.length} événements trouvés au total.`);

    const eventsToCheck = allEvents.filter(e => !report.checkedIds.includes(e.id));
    console.log(`🔍 Il reste ${eventsToCheck.length} événements à filtrer.\n`);

    const batches = chunkArray(eventsToCheck, 10);

    let batchIndex = 1;
    for (const batch of batches) {
        console.log(`⏳ Traitement du lot ${batchIndex}/${batches.length}...`);

        await Promise.all(batch.map(async (event) => {
            try {
                const isOk = await checkAmbiguity(event.titre);
                if (!isOk) {
                    console.log(`  ❌ [SIGNALÉ] : "${event.titre}" (Date: ${event.date_formatee})`);
                    report.flaggedEvents.push({ id: event.id, titre: event.titre, date: event.date_formatee });
                } else {
                    // console.log(`  ✅ [OK] : "${event.titre}"`);
                }
                report.checkedIds.push(event.id);
            } catch (err) {
                console.error(`Erreur sur l'événement ${event.id}: ${err.message}`);
            }
        }));

        saveReport(report);
        batchIndex++;
        // Petite pause pour ne pas affoler l'API
        await new Promise(r => setTimeout(r, 500));
    }

    console.log("\n🎉 AUDIT TEXTE TERMINÉ ! Les résultats sont dans audit_ethique_report.json");
}

runAudit();


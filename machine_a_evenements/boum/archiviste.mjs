import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// --- GESTION DE LA BASE LOCALE ---
const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

// --- FONCTION DE FETCH AVEC RETRY ---
async function fetchWithRetry(url, options, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s max (Rapide pour GPT-4o-mini)

            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.status === 429) {
                // Exponential backoff
                const waitTime = 5000 * attempt;
                console.warn(`⏳ [Rate Limit] Pause de ${waitTime / 1000}s (tentative ${attempt}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, waitTime));

                // Si on est à la dernière tentative et c'est toujours 429, on lance une erreur
                if (attempt === maxRetries) {
                    throw new Error("Rate limit dépassé après plusieurs tentatives");
                }
                continue;
            }

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response;

        } catch (err) {
            if (attempt === maxRetries) throw err; // On propage l'erreur au bout max retries
            // Si c'est une erreur réseau ou abort, on attend un peu
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

// --- FONCTION IA (LE TEST EN AVEUGLE) ---
async function blindTestYear(titre) {
    const apiKey = process.env.OPENAI_API_KEY;

    const prompt = `À quelle année s'est déroulé l'événement historique suivant : "${titre}" ? 
Réponds UNIQUEMENT par l'année sous forme de chiffres (ex: 1789, 45, 1999). Ne mets aucun texte autour. 
Si l'événement n'existe pas ou s'il est impossible à dater avec certitude sur une année, réponds "INCONNU".`;

    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 10
        })
    });

    const data = await res.json();
    const answer = data.choices[0].message.content.trim();

    // Extraction des chiffres si l'IA bavarde un peu
    const match = answer.match(/\d+/);
    if (!match && answer.includes("INCONNU")) return "INCONNU";
    return match ? parseInt(match[0]) : "INCONNU";
}

// --- AGENT ARCHIVISTE ---
async function runArchiviste() {
    console.log("======================================================");
    console.log("  📚 DÉMARRAGE DE L'AGENT ARCHIVISTE (Test en aveugle)");
    console.log("======================================================\n");

    console.log("📥 Démarrage du scan global des événements PENDING dans labo...");

    let totalProcessed = 0;
    while (true) {
        // On prend un lot de 100
        const { data: prospects, error } = await localDb
            .from('labo')
            .select('*')
            .eq('status', 'PENDING')
            .limit(100);

        if (error) {
            console.error("❌ Erreur accès BD Locale:", error.message);
            break;
        }

        if (!prospects || prospects.length === 0) {
            console.log("✅ Plus aucun événement en attente de vérification !");
            break;
        }

        console.log(`\n🔍 Vérification aveugle de ${prospects.length} événements (batches de 10 en parallèle)...`);

        // Découpage en batches de 10 pour paralléliser sans surcharger l'API
        const BATCH_SIZE = 10;
        for (let i = 0; i < prospects.length; i += BATCH_SIZE) {
            const batch = prospects.slice(i, i + BATCH_SIZE);
            console.log(`⏳ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(prospects.length / BATCH_SIZE)}...`);

            await Promise.all(batch.map(async (prospect) => {
                try {
                    const iaYear = await blindTestYear(prospect.titre);
                    let isMatching = false;
                    let statusMessage = "";

                    if (iaYear === "INCONNU") {
                        isMatching = false;
                        statusMessage = "ERROR";
                    } else {
                        if (prospect.year >= 1000) {
                            isMatching = (iaYear === prospect.year);
                        } else {
                            isMatching = (iaYear >= prospect.year && iaYear <= prospect.year + 4);
                        }
                        statusMessage = isMatching ? "VERIFIED" : "ERROR";
                    }

                    if (isMatching) {
                        console.log(`  ✅ [VERIFIÉ] "${prospect.titre}" : ${prospect.year}`);
                    } else {
                        console.log(`  ❌ [ALERTE]  "${prospect.titre}" : Attendu ${prospect.year} | IA dit ${iaYear}`);
                    }

                    await localDb
                        .from('labo')
                        .update({ status: statusMessage })
                        .eq('id', prospect.id);

                    totalProcessed++;
                } catch (err) {
                    console.error(`  ⚠️ Erreur technique sur l'événement "${prospect.titre}" :`, err.message);
                }
            }));

            // Courte pause entre les batches pour ne pas saturer l'API
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n💥 MISSION DE L'ARCHIVISTE TERMINÉE ! Total vérifié : ${totalProcessed}`);
}

runArchiviste();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const GEMINI_KEY = process.env.GEMINI_API_KEY;

function extractJsonFromText(rawText) {
    if (typeof rawText !== 'string') throw new Error('Réponse IA vide ou non textuelle');
    let text = rawText.trim();
    text = text.replace(/```json\s*/gi, '```');
    const fenced = text.match(/```([\s\S]*?)```/);
    if (fenced?.[1]) text = fenced[1].trim();

    try {
        return JSON.parse(text);
    } catch {
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let start = -1;
        if (firstBrace === -1) start = firstBracket;
        else if (firstBracket === -1) start = firstBrace;
        else start = Math.min(firstBrace, firstBracket);

        if (start === -1) throw new Error('JSON introuvable dans la réponse IA');
        const candidate = text.slice(start);

        const objMatch = candidate.match(/\{[\s\S]*\}/);
        const arrMatch = candidate.match(/\[[\s\S]*\]/);
        const picked = arrMatch && objMatch
            ? (arrMatch[0].length >= objMatch[0].length ? arrMatch[0] : objMatch[0])
            : (arrMatch?.[0] || objMatch?.[0]);
        if (!picked) throw new Error('JSON introuvable dans la réponse IA');
        return JSON.parse(picked);
    }
}

/**
 * Audit un lot d'événements avec Gemini 1.5 Flash (plus stable et économique).
 * Intègre une protection contre les réponses vides.
 */
async function auditBatch(records) {
    const prompt = `
Tu es un Expert Historien Impitoyable.
TA MISSION : Vérifier l'exactitude de ces records.

CONSIGNES :
1. EXACTITUDE DATE : Si l'année est décalée de plus de 1 an : VERDICT = ERREUR.
2. VÉRACITÉ : Si l'événement est inventé : VERDICT = ERREUR.
3. AMBIGUÏTÉ : Si le titre est trompeur.

LISTE :
${records.map(r => `ID:${r.id} | ${r.year} | ${r.titre}`).join('\n')}

Renvoie UNIQUEMENT un JSON :
[ { "id": ID, "verdict": "OK" ou "ERREUR", "raison": "..." } ]`;

    // Utilisation de Gemini 2.0 Flash (disponible sur ton compte)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
            })
        });

        const data = await res.json();

        if (data.error) {
            console.error(`   ⚠️ Erreur API Gemini : ${data.error.code} - ${data.error.message}`);
            return [];
        }

        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

        const parsed = extractJsonFromText(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("   ❌ Erreur d'appel ou de parsing :", e.message);
        return [];
    }
}

async function startAudit() {
    console.log("🚀 Lancement de l'audit sécurisé (Gemini 1.5 Flash)...");

    let totalProcessed = 0;
    let totalErrors = 0;

    while (true) {
        // On prend les records qui ne sont PAS ENCORE traités
        const { data: records, error } = await supabase
            .from('labo')
            .select('id, year, titre')
            .in('status', ['PENDING', 'ERROR'])
            .limit(50);

        if (error) {
            console.error("❌ Erreur DB :", error.message);
            break;
        }

        if (!records || records.length === 0) {
            console.log("\n🏁 Audit terminé. Tous les records ont été traités.");
            break;
        }

        console.log(`\n🔎 Analyse du lot (${records.length} records)...`);

        const results = await auditBatch(records);

        if (results.length === 0) {
            console.log("   ⚠️ Échec de l'IA sur ce lot. Marquage temporaire pour éviter la boucle infinie.");
            await supabase.from('labo').update({ status: 'ERROR', error_log: 'AUDIT_EMPTY_RESPONSE' }).in('id', records.map(r => r.id));
            continue;
        }

        for (const res of results) {
            if (res.verdict === "OK") {
                await supabase.from('labo').update({ status: 'VERIFIED' }).eq('id', res.id);
            } else {
                await supabase.from('labo').update({ status: 'ERROR', error_log: res.raison }).eq('id', res.id);
                console.log(`   ❌ REJET : ${res.id} | ${res.raison}`);
                totalErrors++;
            }
            totalProcessed++;
        }

        console.log(`   ✅ Lot traité. Progression : ${totalProcessed} analysés.`);

        // Petite pause pour les quotas
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n📊 BILAN : ${totalProcessed} traités, ${totalErrors} erreurs détectées.`);
}

startAudit();


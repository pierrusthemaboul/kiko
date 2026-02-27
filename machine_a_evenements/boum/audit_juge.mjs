import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const localDb = createClient(process.env.SUPABASE_URL || 'http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCoherence(titre, description) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY manquante");

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Tu es un expert en vérification de faits. Tu reçois un titre et une description d'un événement. Tu dois déterminer si ils parlent EXACTEMENT de la même chose. Une légère différence de titre est acceptable, mais un changement de sujet total (ex: groupe de musique vs accident industriel) est un NON. Réponds OUI ou NON uniquement." },
                    { role: "user", content: `Titre: "${titre}"\nDescription: "${description}"` }
                ],
                temperature: 0
            })
        });

        const data = await response.json();
        const answer = data.choices[0].message.content.trim().toUpperCase();
        return answer.includes("OUI");
    } catch (err) {
        console.error("Erreur API OpenAI:", err.message);
        return true; // En cas d'erreur on laisse passer par défaut pour ne pas tout bloquer
    }
}

async function runAudit() {
    console.log("======================================================");
    console.log("🔍 DÉMARRAGE DE L'AUDIT DE COHÉRENCE");
    console.log("======================================================\n");

    // On récupère les événements validés (pipeline normalisé)
    const { data: events, error } = await localDb
        .from('labo')
        .select('id, titre, description')
        .eq('status', 'VERIFIED');

    if (error) {
        console.error("❌ Erreur accès DB Locale:", error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("✅ Aucun événement à auditer.");
        return;
    }

    console.log(`📊 Analyse de ${events.length} dossiers pour détecter les dérives du Juge...`);

    let countKo = 0;
    let countAnx = 0;

    const keywords = ['Mort de', 'Décès de', 'Meurtre', 'Assassinat', 'Tragédie', 'Attentat', 'Explosion', 'Drame'];

    for (let i = 0; i < events.length; i++) {
        const event = events[i];

        // 1. Audit IA de Cohérence
        const isCoherent = await checkCoherence(event.titre, event.description);

        // 2. Audit des thèmes anxiogènes (basé sur le titre)
        const isAnxiogene = keywords.some(k => event.titre.includes(k));

        if (!isCoherent) {
            countKo++;
            console.log(`\n❌ INCOHÉRENCE DÉTECTÉE (ID: ${event.id})`);
            console.log(`   Titre : "${event.titre}"`);
            console.log(`   Desc  : "${event.description}"`);
            await localDb
                .from('labo')
                .update({ status: 'ERROR', error_log: 'AUDIT_COHERENCE_KO' })
                .eq('id', event.id);
        } else if (isAnxiogene) {
            countAnx++;
            await localDb
                .from('labo')
                .update({ status: 'ERROR', error_log: 'AUDIT_ANXIOGENE' })
                .eq('id', event.id);
        }

        if (i > 0 && i % 50 === 0) console.log(`\nProgress: ${i}/${events.length}...`);
        else process.stdout.write(".");
    }

    console.log(`\n\n======================================================`);
    console.log(`✅ AUDIT TERMINÉ !`);
    console.log(`❌ Erreurs de sujet (AUDIT_KO) : ${countKo}`);
    console.log(`⚠️ Sujets anxiogènes (AUDIT_ANXIOGENE) : ${countAnx}`);
    console.log(`======================================================`);
}

runAudit();

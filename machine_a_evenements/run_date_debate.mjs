import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Modèle de Défense (Texte libre)
const modelAvocat = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// Modèle du Juge (Format JSON obligé)
const modelJuge = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function processDossier(suspect, eventData, index, total) {
    // 1. Débat - La Défense
    const promptAvocat = `
Tu es l'Avocat de la Défense, un expert en Histoire passionné par les détails oubliés.
Ton client est l'événement "${eventData.titre}".
Dans notre base de données, la date enregistrée est : ${eventData.date}.
Sa description est : "${eventData.description_detaillee}".

L'Accusation prétend que cette date est erronée car : "${suspect.erreur_detectee}".

TA MISSION :
Trouve N'IMPORTE QUELLE justification historique rigoureuse pour excuser et sauver la date actuelle (${eventData.date}).
Cherche des détails obscurs : est-ce le début d'un siège de plusieurs mois ? La signature d'un traité préliminaire ? Le vote de la loi avant sa promulgation ? L'année de naissance de la figure historique ?
S'il est impossible de défendre la date (ex: anachronisme de 100 ans), plaide coupable.
Sois concis et percutant (2 à 3 phrases).
`;

    let plaidoyer = "";
    try {
        const resAvocat = await modelAvocat.generateContent(promptAvocat);
        plaidoyer = resAvocat.response.text().trim();
    } catch (e) {
        return null;
    }

    // 2. Débat - Le Jugement
    const promptJuge = `
Tu es le Juge Suprême. Ton rôle est de trancher si la date d'un événement dans notre base doit ABSOLUMENT être corrigée.

Dossier en cours :
- Événement : "${eventData.titre}"
- Date contestée en base : ${eventData.date}
- Motif de l'accusation : "${suspect.erreur_detectee}"
- Plaidoyer de la Défense : "${plaidoyer}"

MISSION :
Évalue l'argument de l'Avocat. A-t-il semé un doute raisonnable ou une justification vraie ? 
- Si l'avocat a une bonne excuse stipulant que l'événement s'étalait ou a eu une origine à cette date, on GARDE la date.
- Si l'avocat admet la faute ou si l'excuse est absurde, on CORRIGE.

Format de réponse (JSON exclusif):
{
  "score_culpabilite": <0 à 100. 100 = totalement faux, à corriger. 0 = date justifiable et avérée>,
  "verdict_explication": "<Une explication très courte>",
  "action": "<GARDER ou CORRIGER>"
}
`;
    try {
        const resJuge = await modelJuge.generateContent(promptJuge);
        const jugement = JSON.parse(resJuge.response.text());

        console.log(`[${index}/${total}] ${eventData.titre.substring(0, 30)}... | Score: ${jugement.score_culpabilite} | Décision: ${jugement.action}`);

        return {
            id: suspect.id,
            titre: eventData.titre,
            date_actuelle: eventData.date,
            accusation: suspect.erreur_detectee,
            plaidoyer_avocat: plaidoyer,
            juge_score: jugement.score_culpabilite,
            juge_action: jugement.action,
            juge_explication: jugement.verdict_explication,
            date_suggeree: suspect.date_corrige_suggeree
        };
    } catch (e) {
        return null;
    }
}

// Fonction pour paralléliser intelligemment avec un nombre max de connexions
async function pMap(array, asyncCallback, concurrency) {
    let index = 0;
    const ret = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => asyncCallback(item, index++, array));
        ret.push(p);
        if (concurrency <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= concurrency) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}

async function runDebate() {
    const inputPath = path.join(__dirname, 'rapport_dates_suspectes.json');
    if (!fs.existsSync(inputPath)) {
        console.error("❌ Fichier introuvable."); return;
    }

    const suspects = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`\n⚖️ OUVERTURE DU TRIBUNAL MULTI-AGENTS POUR ${suspects.length} DOSSIERS...`);

    // Récupération de tout le contexte depuis Supabase
    process.stdout.write(`📥 Chargement des descriptions complètes depuis Supabase...`);
    const ids = suspects.map(s => s.id);
    let allEventsMap = new Map();
    for (let i = 0; i < ids.length; i += 100) {
        const { data } = await supabase.from('evenements').select('id, titre, date, description_detaillee').in('id', ids.slice(i, i + 100));
        if (data) data.forEach(e => allEventsMap.set(e.id, e));
    }
    console.log(" ✅ TERMINÉ.\n");

    const validSuspects = suspects.filter(s => allEventsMap.has(s.id));

    console.log(`🚀 Déclenchement des plaidoiries en parallèle...`);
    // Concurrency de 8 requêtes parallèles pour aller vite sans exploser le Rate Limit Gemini Flash.
    const verdicts = await pMap(validSuspects, async (suspect, idx) => {
        const eventData = allEventsMap.get(suspect.id);
        const result = await processDossier(suspect, eventData, idx + 1, validSuspects.length);
        return result;
    }, 8);

    const cleanVerdicts = verdicts.filter(v => v !== null);

    const aCorriger = cleanVerdicts.filter(v => v.juge_action === "CORRIGER");
    const aGarder = cleanVerdicts.filter(v => v.juge_action === "GARDER");

    console.log(`\n======================================================`);
    console.log(`🏁 LE TRIBUNAL A RENDU SES DÉCISIONS.`);
    console.log(`💚 Dates acquittées (Sauvées par l'Avocat) : ${aGarder.length}`);
    console.log(`🚨 Dates condamnées (À corriger d'urgence)   : ${aCorriger.length}`);

    const outputPath = path.join(__dirname, 'jugement_final.json');
    fs.writeFileSync(outputPath, JSON.stringify(cleanVerdicts, null, 2));
    console.log(`📄 Dossier archivé consultable : jugement_final.json`);
    console.log(`======================================================`);
}

runDebate();

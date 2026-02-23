
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';

const agentName = "GENESIS";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    const count = parseInt(process.argv[2]) || 50;
    let theme = process.argv[3] || "";

    // Récupération du contexte (avec limitation pour ne pas exploser le prompt)
    const contextPath = path.join(process.cwd(), 'STORAGE/INPUT/seed_context.md');
    let context = "";
    if (fs.existsSync(contextPath)) {
        context = fs.readFileSync(contextPath, 'utf8');
        if (context.length > 15000) {
            console.log(`[GENESIS] ⚠️ Contexte très long (${context.length} chars), tronquage...`);
            context = context.substring(0, 15000) + "... [TRONQUÉ]";
        }
    }

    // Récupération de l'historique de la session actuelle
    const sessionPath = path.join(process.cwd(), '../session_history.json');
    let sessionHistory = "";
    let sessionRejections = "";
    if (fs.existsSync(sessionPath)) {
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        const validated = Array.isArray(sessionData) ? sessionData : (sessionData.validated || []);
        const rejections = sessionData.rejections || [];
        sessionHistory = validated.map(e => `${e.titre} (${e.year})`).slice(-50).join(', ');
        sessionRejections = rejections.map(e => `${e.titre} (${e.year})`).slice(-50).join(', ');
    }

    // Récupération du thème par défaut si non fourni
    if (!theme) {
        const inputPath = path.join(process.cwd(), 'STORAGE/INPUT/seed_theme.txt');
        theme = fs.existsSync(inputPath) ? fs.readFileSync(inputPath, 'utf8') : "Histoire de France";
    }

    console.log(`[GENESIS] Début de génération pour le thème : ${theme}`);

    const prompt = `
Tu es GENESIS, l'explorateur historique de la Machine Kiko.
Ta mission est de produire une liste de ${count} événements historiques majeurs pour le thème suivant : ${theme}.

⚠️ STRATÉGIE ANTI-DOUBLONS (CRITIQUE) :
- Ton objectif est d'apporter du SANG NEUF. 
- Ne propose JAMAIS un événement qui est déjà dans le CONTEXTE ou l'HISTORIQUE ci-dessous.
- Si le thème est large, cherche la "deuxième couche" : des événements qui sont des piliers de culture générale (notoriété 75-85) mais qui ne sont pas les 5-10 clichés absolus.

CONTEXTE (ÉVÉNEMENTS DÉJÀ PRÉSENTS - INTERDICTION DE LES REPRODUIRE) :
${context}

HISTORIQUE RÉCENT : ${sessionHistory || "Néant"}
LISTE NOIRE RÉCENTE : ${sessionRejections || "Néant"}

⚠️ RÈGLE DE RIGUEUR ET CONSENSUS :
- Chaque événement doit faire l'objet d'un CONSENSUS HISTORIQUE. 
- L'ANNÉE doit être EXACTE et vérifiée. ⚠️ Le jeu Kiko ne se base QUE sur l'année. Ne te soucie pas du mois ou du jour. Fournir l'année suffit amplement.

⚠️⚠️⚠️ RÈGLE ABSOLUE - INTERDICTION DES ÉVÉNEMENTS AVANT L'AN 100 ⚠️⚠️⚠️
- TOUS les événements doivent avoir une année >= 100 (après J.-C.)
- ÉVÉNEMENTS INTERDITS : Alésia, Guerre des Gaules, Vercingétorix, Jules César.

SI TU GÉNÈRES UN ÉVÉNEMENT AVANT L'AN 100, IL SERA AUTOMATIQUEMENT REJETÉ.
Commence l'histoire de France à partir du Moyen Âge (année >= 100).
VÉRIFIE bien que TOUS les événements ont year >= 100 avant de répondre.
⚠️ RÈGLE DE TITRAGE CHIRURGICALE :
- INTERDICTION des titres décrivant des plages de temps ou des durées (ex: "Règne de Septime Sévère").
- Chaque titre doit désigner un ÉVÉNEMENT PRÉCIS que l'on peut dater à l'année près (ex: "Avènement de Septime Sévère", "Mort de Septime Sévère", "Bataille de...").
- Pour les débuts de règne, privilégie : "Avènement de", "Couronnement de", "Accession au trône de".

⚠️ TITRE : TRÈS COURT (Maximum 50 caractères).
⚠️ INTERDICTION DES DATES : Ne mets JAMAIS l'année ou une date dans le titre (ex: PAS de "Bataille de Poitiers (1356)").
⚠️ ANTI-HOMONYMIE ET ANTI-GÉNÉRIQUE : Les titres qui peuvent correspondre à plusieurs années (ex: "Grève des mineurs", "Élections présidentielles", "Séisme au Japon") sont INTERDITS. Tu DOIS le singulariser en nommant le protagoniste, la loi, ou la cause (ex: "Grève des mineurs d'Arthur Cook", "Élection de JFK", "Séisme de Fukushima").
⚠️ PRECISION : Évite les titres trop banals. Préfère "Accession au trône d'Henri IV" à "Le nouveau roi".

FORMAT JSON EXCLUSIF :
{
  "events": [
    { "titre": "Invention de la machine à coudre par Barthélemy Thimonnier", "year": 1829 },
    ...
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        // 🚫 POST-VALIDATION : Filtrer les événements avant l'an 100
        const validEvents = data.events.filter(e => e.year >= 100);
        const rejectedCount = data.events.length - validEvents.length;

        if (rejectedCount > 0) {
            console.log(`[GENESIS] ⚠️  ${rejectedCount} événements rejetés (année < 100)`);
            data.events.filter(e => e.year < 100).forEach(e => {
                console.log(`   ❌ Rejeté: "${e.titre}" (${e.year})`);
            });
        }

        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/genesis_raw_batch.json');
        fs.writeFileSync(outputPath, JSON.stringify(validEvents, null, 2));

        logDecision(agentName, 'GENERATE', { theme }, 'SUCCESS', `${validEvents.length} idées générées (Mode Ouvert, ${rejectedCount} rejetés pour année < 100)`, { file: 'genesis_raw_batch.json' });

    } catch (e) {
        logDecision(agentName, 'GENERATE', { theme }, 'ERROR', e.message);
        process.exit(1);
    }
}

main();

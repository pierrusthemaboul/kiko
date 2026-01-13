import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Polyfills
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: envPath });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error(`❌ Erreur: GEMINI_API_KEY manquante.`); process.exit(1); }

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Agents à auditer
const AGENTS = [
    { name: "LOUIS (CMO)", file: '../../AGENTS/N2/LOUIS.md' },
    { name: "MARC (Stratégie)", file: '../../AGENTS/N1/MARC.md' },
    { name: "HUGO (Twitter)", file: '../../AGENTS/N1/HUGO.md' },
    { name: "CHLOE (TikTok)", file: '../../AGENTS/N1/CHLOE.md' },
    { name: "JADE (Data)", file: '../../AGENTS/N1/JADE.md' }
];

async function askAgentNeeds(agentName, personaPath) {
    const persona = fs.readFileSync(path.join(__dirname, personaPath), 'utf-8');

    console.log(`🎤 Interview de ${agentName}...`);

    const prompt = `
    TU ES : ${agentName}
    TON PROFIL : 
    ${persona}

    TA MISSION :
    Fais une auto-critique honnête de ta situation actuelle dans l'entreprise K-Hive.
    
    Q1 : Qu'est-ce qui te manque pour être 2x plus efficace ?
    Q2 : As-tu besoin d'un NOUVEAU COLLEGUE (Agent N) pour déléguer une tâche ingrate ? Si oui, quel profil ?
    Q3 : As-tu besoin d'un NOUVEL OUTIL (Script/API) ? Si oui, pour faire quoi ?

    Réponds sous ce format JSON uniquement :
    {
        "mood": "Content/Frustré/Surchargé",
        "need_colleague": "Non ou Titre du poste",
        "need_tool": "Non ou Description outil",
        "justification": "Eplication courte"
    }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Nettoyage JSON basique
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        return { mood: "Confus", justification: "Erreur de réponse (Format invalide)" };
    }
}

async function main() {
    console.log("🕵️  LANCEMENT DE L'AUDIT RH & TECH...\n");
    let report = "# 📋 RAPPORT D'AUDIT INTERNE\n\n";

    for (const agent of AGENTS) {
        const feedback = await askAgentNeeds(agent.name, agent.file);

        console.log(`   👤 ${agent.name} : ${feedback.mood}`);
        report += `## ${agent.name}\n`;
        report += `*   **Humeur** : ${feedback.mood}\n`;
        report += `*   **Besoin RH** : ${feedback.need_colleague}\n`;
        report += `*   **Besoin Tech** : ${feedback.need_tool}\n`;
        report += `*   **Pourquoi** : ${feedback.justification}\n\n`;
    }

    const reportPath = path.join(__dirname, '../../DATA_INBOX/INTERNAL_AUDIT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Audit terminé. Rapport : ${reportPath}`);
}

main();


import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';

const agentName = "CONSEIL";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    const auditPath = path.join(process.cwd(), 'STORAGE/INPUT/audit_report.json');
    if (!fs.existsSync(auditPath)) {
        console.error("[CONSEIL] Erreur: Aucun rapport d'audit trouvé. Lancez d'abord auditeur.mjs.");
        process.exit(1);
    }

    const auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

    console.log("🏛️ [CONSEIL] Délibération du Conseil des Sages en cours...");

    const prompt = `
Tu es le CONSEIL DES SAGES de Kiko, un jeu d'histoire pour le marché FRANÇAIS.
Tu dois décider des prochains thèmes à explorer pour enrichir la base de données.

DONNÉES D'AUDIT :
${JSON.stringify(auditData, null, 2)}

PERSONNAGES PRÉSENTS :
1. L'OBSERVATEUR : Analyse les manques statistiques (trous dans les époques ou les régions).
2. L'HISTORIEN CULTUREL : Garant de l'équilibre historique et de la diversité.
3. LE NOTORIÉTÉ : Expert en culture générale française. Il rejette les thèmes trop obscurs pour le grand public.

ORDRE DU JOUR :
1. Analyser les données d'audit.
2. Simuler un court débat entre les 3 personnages.
3. Proposer 3 recommandations de thèmes prioritaires.

RÈGLES POUR LE MARCHÉ FRANÇAIS :
- Prioriser les événements que les Français apprennent à l'école ou voient dans les médias.
- Équilibrer entre la France (40%) et le Monde (60%).
- Notoriété visée : > 70.

FORMAT JSON REQUIS :
{
  "analyse": "Résumé de la situation actuelle",
  "conclusions_debat": "Synthèse des échanges entre l'Observateur, l'Historien et la Notoriété",
  "recommandations": [
    {
      "theme": "Nom du thème (ex: La Révolution Industrielle)",
      "priorite": "Haute/Moyenne",
      "raison": "Explication du choix",
      "cible_count": 15
    }
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const decision = JSON.parse(result.response.text());

        const outputDir = path.resolve(process.cwd(), 'STORAGE/OUTPUT');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, 'decision_conseil.json');
        fs.writeFileSync(outputPath, JSON.stringify(decision, null, 2));

        console.log("\n✨ [CONSEIL] Délibération terminée !");
        console.log("----------------------------------------");
        decision.recommandations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec.theme} (Priorité: ${rec.priorite})`);
            console.log(`   👉 ${rec.raison}`);
        });
        console.log("----------------------------------------");

        logDecision(agentName, 'DECISION', { auditSummary: decision.analyse }, 'SUCCESS', 'Nouvelles recommandations générées');

    } catch (error) {
        console.error("[CONSEIL] Erreur lors de la délibération:", error.message);
        logDecision(agentName, 'DECISION', {}, 'ERROR', error.message);
        process.exit(1);
    }
}

main();

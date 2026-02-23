import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function auditDates() {
    console.log("============================================================");
    console.log("🕵️ DÉMARRAGE DE L'INSPECTEUR DES DATES (Mode Scan Sécurisé)");
    console.log("============================================================\n");

    // 1. Récupération des données (Lecture seule)
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    console.log(`✅ ${allEvents.length} événements à inspecter.\n`);

    // 2. Traitement par petits "Dossiers" (Batches de 20 max pour garder 100% d'attention)
    const batchSize = 20;
    let erreursDetectees = [];

    for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        process.stdout.write(`🔍 Inspection du dossier ${i} à ${i + batch.length}... `);

        // Le Prompt de l'Inspecteur (Très strict, binaire, focus sur une seule chose)
        const prompt = `
Tu es un Historien et un Inspecteur intraitable.
Voici un dossier contenant ${batch.length} événements historiques.
Ta SEULE mission est de vérifier l'exactitude chronologique (Année et Mois) de chaque événement.

RÈGLE D'OR : 
Si la date est PARFAITE (l'année est la bonne), TU NE DIS RIEN, tu l'ignores.
Si tu détectes une ERREUR HISTORIQUE flagrante (ex: mauvaise année, date inventée, décalage d'un siècle), tu la mets dans ton rapport d'Alerte.

Dossier à vérifier :
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, date_en_base: e.date })))}

FORMAT DU RAPPORT (Uniquement si tu trouves des erreurs, sinon renvoie un tableau vide "alertes": []) :
{
  "alertes": [
    {
      "id": "l'uuid de l'erreur",
      "titre": "Titre",
      "erreur_detectee": "Explication courte de l'erreur",
      "date_corrige_suggeree": "YYYY-MM-DD"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.alertes && data.alertes.length > 0) {
                // Double vérification de sécurité (au cas où l'IA hallucine un ID)
                const alertesValides = data.alertes.filter(a => batch.find(b => b.id === a.id));

                if (alertesValides.length > 0) {
                    console.log(` ⚠️ ${alertesValides.length} dates suspectes !`);
                    erreursDetectees.push(...alertesValides);
                } else {
                    console.log(` ✅ OK (Faux positifs ignorés)`);
                }
            } else {
                console.log(` ✅ OK`);
            }
        } catch (e) {
            console.log(` ❌ Erreur IA: ${e.message}`);
        }

        // Pause pour ne pas saturer l'API
        await new Promise(res => setTimeout(res, 1000));
    }

    // 3. Sauvegarde du Rapport d'Anomalies (Rien n'est touché en base)
    const outputFile = path.join(__dirname, 'rapport_dates_suspectes.json');
    fs.writeFileSync(outputFile, JSON.stringify(erreursDetectees, null, 2));

    console.log(`\n============================================================`);
    console.log(`🏁 MISSION TERMINÉE.`);
    console.log(`🚨 ${erreursDetectees.length} erreurs potentielles détectées sur ${allEvents.length} événements.`);
    console.log(`📄 Le rapport a été généré : rapport_dates_suspectes.json`);
    console.log(`============================================================\n`);
}

auditDates();

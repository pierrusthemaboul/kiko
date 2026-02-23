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
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

async function preparerCorrections() {
    console.log("📥 PRÉPARATION SÉCURISÉE : Scan des homonymies (Aucune modification en base)...");

    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date, description_detaillee')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    console.log(`✅ ${allEvents.length} événements chargés. Initiation de l'audit...`);

    const batchSize = 100;
    let propositions = [];

    for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        process.stdout.write(`🔍 Analyse silencieuse du lot ${i} à ${i + batch.length}...\n`);

        const prompt = `
Voici une liste d'événements historiques.
Ta mission : repérer les TITRES AMBIGUS (ex: "L'Argentine gagne la Coupe du Monde", "Élection présidentielle", "Guerre du Liban") qui pourraient correspondre à plusieurs années et créer une confusion chez le joueur.

RÈGLES :
1. Propose un NOUVEAU TITRE qui enlève l'ambiguïté (ex: en ajoutant le nom du pays organisateur, le protagoniste, ou "Première/Seconde").
2. INTERDIT d'ajouter une date ou une année dans le nouveau titre.
3. Si le titre original est déjà très précis ("Première Coupe du monde de football", "Prise de la Bastille"), IGNORE-LE. NE le liste pas.

List:
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, annee: (e.date || '').substring(0, 4), description: e.description_detaillee })))}

FORMAT ATTENDU :
{
  "corrections": [
    {
      "id": "uuid",
      "nouveau_titre": "Nouveau Titre Précis"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.corrections && data.corrections.length > 0) {
                for (let corr of data.corrections) {
                    const original = batch.find(b => b.id === corr.id);
                    // Règle de sécurité : Seulement si l'ID existe et que le titre est diffèrent
                    if (original && original.titre !== corr.nouveau_titre) {
                        propositions.push({
                            id: original.id,
                            annee: (original.date || '').substring(0, 4),
                            titre_actuel: original.titre,
                            titre_propose: corr.nouveau_titre,
                            contexte: original.description_detaillee.substring(0, 100) + "...",
                            appliquer: true // Par défaut, on demandera à l'utilisateur de vérifier ça
                        });
                    }
                }
            }
        } catch (e) {
            console.error("❌ Erreur Gemini (ignorée) :", e.message);
        }
        await new Promise(res => setTimeout(res, 2000));
    }

    // Sauvegarde dans un fichier JSON local
    const outputFile = path.join(__dirname, 'propositions_homonymes.json');
    fs.writeFileSync(outputFile, JSON.stringify(propositions, null, 2));

    console.log(`\n=================================================`);
    console.log(`🛡️ SCAN TERMINÉ SANS TOUCHER À LA PRODUCTION !`);
    console.log(`📄 Fichier généré : propositions_homonymes.json`);
    console.log(`🎯 Nombre de propositions à relire : ${propositions.length}`);
    console.log(`👉 Tu peux l'ouvrir dans ton éditeur, passer la valeur "appliquer" à false si tu n'aimes pas la proposition, puis on lancera un script d'application !`);
    console.log(`=================================================`);
}

preparerCorrections();

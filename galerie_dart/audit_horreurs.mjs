import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Utilisation de Flash pour le coût/vitesse

const AUDIT_PROMPT = `Tu es un expert en contrôle qualité pour un jeu vidéo historique.
Analyse cette image générée par IA et cherche les ERREURS DE GÉNÉRATION (Hallucinations) :
1. Objets flottants (chapeaux, lampes, membres qui ne sont pas attachés à un corps).
2. Surrealisme involontaire (mélange d'époques absurde, échelles de tailles impossibles).
3. Visages déformés ou personnages "à peine dessinés" / fondus dans le décor.
4. Texte illisible ou répétitif (ex: "Les Les Misérables").

Réponds UNIQUEMENT au format JSON suivant :
{
  "statut": "CLEAN" ou "HORREUR",
  "score_horreur": 0 à 10 (10 = cauchemar visuel),
  "raison": "Explication courte du problème"
}`;

async function auditHorrors() {
    console.log("🕵️ Démarrage de l'Audit des Horreurs Visuelles...");
    
    // On prend un échantillon de 20 images pour voir l'étendue des dégâts
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url')
        .limit(20);

    if (error) throw error;

    const results = [];

    for (const event of events) {
        if (!event.illustration_url) continue;

        console.log(`🔍 Audit de : ${event.titre}`);
        try {
            const resp = await fetch(event.illustration_url);
            const buffer = await resp.arrayBuffer();
            
            const result = await model.generateContent([
                AUDIT_PROMPT,
                {
                    inlineData: {
                        data: Buffer.from(buffer).toString("base64"),
                        mimeType: "image/webp"
                    }
                }
            ]);

            const analysis = JSON.parse(result.response.text().replace(/```json|```/g, ""));
            results.push({ ...event, ...analysis });
            
            if (analysis.statut === "HORREUR") {
                console.log(`⚠️ HORREUR DÉTECTÉE [Score ${analysis.score_horreur}]: ${analysis.raison}`);
            }
        } catch (e) {
            console.error(`❌ Erreur audit ${event.titre}:`, e.message);
        }
    }

    console.log("\n📊 RÉSUMÉ DE L'AUDIT :");
    const horrors = results.filter(r => r.statut === "HORREUR");
    console.log(`Sur 20 images : ${horrors.length} sont des horreurs (${(horrors.length/20*100)}%).`);
}

auditHorrors().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', 'admin_web', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; 
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceKey || !geminiApiKey) {
    console.error("❌ Erreur : Variables d'environnement manquantes (Supabase ou Gemini)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function getImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer).toString('base64');
    } catch (error) {
        console.error(`  ⚠️ Impossible de télécharger l'image : ${url}`);
        return null;
    }
}

async function auditCopyright(event) {
    console.log(`\n🔍 Audit : "${event.titre}"`);
    
    if (!event.illustration_url) {
        console.log("  ⚠️ Aucune illustration, skipping.");
        return;
    }

    const base64Image = await getImageAsBase64(event.illustration_url);
    if (!base64Image) return;

    const prompt = `Ton rôle est d'auditer les événements historiques pour une application de quiz (Kiko) afin d'identifier les risques de copyright et de marques déposées.
L'événement est : "${event.titre}".

Instructions :
1. Identifie les marques déposées visibles ou suggérées (ex: Nintendo, Coca-Cola).
2. Évalue si l'utilisation est acceptable (contexte historique/éducatif) ou risquée (violation de marque).
3. Vérifie si des logos officiels sont visibles.
4. Donne un score de risque de 0 à 100 (0 = sûr, 100 = violation flagrante).
5. Suggère une modification si le risque est élevé.

Réponds UNIQUEMENT sous forme de JSON avec ce format :
{
  "score": 75,
  "details": "Description courte des marques détectées et des suggestions"
}`;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/webp" // La plupart des images Supabase sont en webp
                }
            }
        ]);

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const auditResult = JSON.parse(jsonMatch[0]);
            console.log(`  ✅ Score : ${auditResult.score}/100`);
            console.log(`  📝 Détails : ${auditResult.details}`);

            const { error } = await supabase
                .from('antichambre')
                .update({
                    copyright_score: auditResult.score,
                    copyright_details: auditResult.details
                })
                .eq('id', event.id);

            if (error) throw error;
        } else {
            console.error("  ❌ Impossible de parser la réponse JSON de l'IA.");
        }
    } catch (error) {
        console.error(`  💥 Erreur lors de l'audit : ${error.message}`);
    }
}

async function runBatchAudit() {
    console.log("🚀 Lancement de l'audit de copyright sur l'Antichambre...");

    // On prend les événements qui n'ont pas encore de score
    const { data: candidates, error } = await supabase
        .from('antichambre')
        .select('id, titre, illustration_url')
        .is('copyright_score', null)
        .limit(20); // On commence par un petit batch pour tester

    if (error) {
        console.error("❌ Erreur récupération Supabase :", error.message);
        return;
    }

    if (!candidates || candidates.length === 0) {
        console.log("✨ Tous les événements sont déjà audités !");
        return;
    }

    for (const event of candidates) {
        await auditCopyright(event);
    }

    console.log("\n🏁 Audit terminé pour ce batch.");
}

runBatchAudit();

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL; // Production URL
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY; // Production Key
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function emergencyRestore() {
    console.log("🚨 [OPÉRATION SAUVETAGE] Restauration définitive des titres en PRODUCTION...");

    // 1. Charger le backup JSON
    let backupMap = new Map();
    try {
        const backupData = JSON.parse(fs.readFileSync(path.join(__dirname, 'post_1945_events.json'), 'utf8'));
        backupData.forEach(e => backupMap.set(e.id, e));
        console.log(`📦 Backup post-1945 chargé : ${backupMap.size} événements.`);
    } catch (e) {
        console.error("❌ Erreur critique : Impossible de charger le backup JSON.");
        return;
    }

    // 2. Identifier TOUS les événements suspects en PROD (incluant les titres vagues)
    const patterns = ["L'Héritage de", "Héritage de", "L'ère ", "L'Ère ", "Hommage à", "Un talent", "Un Règne", "Un Empire", "Un Roi", "L'Ere "];

    let suspects = [];
    for (const p of patterns) {
        const { data } = await supabase.from('evenements').select('*').ilike('titre', `%${p}%`);
        if (data) suspects = suspects.concat(data);
    }

    // Ajout d'une recherche sur donnee_corrigee si elle a été marquée par erreur
    const { data: markedCorrigee } = await supabase.from('evenements').select('*').eq('donnee_corrigee', true).limit(500);
    if (markedCorrigee) suspects = suspects.concat(markedCorrigee);

    // Déduplication par ID
    const targetEvents = Array.from(new Map(suspects.map(item => [item.id, item])).values());
    console.log(`🔍 ${targetEvents.length} événements suspects trouvés en production.`);

    for (const event of targetEvents) {
        process.stdout.write(`\n🔄 Traitement de : "${event.titre}"... `);

        let finalTitre = null;
        let finalDesc = null;

        // Cas A : On a l'original dans le backup JSON
        if (backupMap.has(event.id)) {
            const original = backupMap.get(event.id);
            finalTitre = original.titre;
            finalDesc = original.description_detaillee;
            process.stdout.write(`✅ (Source: JSON) `);
        }
        // Cas B : Pas de backup JSON, on utilise l'IA pour "deviner" le titre historique original
        else {
            process.stdout.write(`🧠 (Source: IA) `);
            const prompt = `Identify the ORIGINAL PRECISE HISTORICAL TITLE for this event. 
Current Vague Title: "${event.titre}"
Description: "${event.description_detaillee}"
Year: ${event.date}
The original title MUST follow the pattern "Mort de...", "Décès de...", "Assassinat de...", or "Exécution de...". 
Output ONLY a JSON object: {"titre": "string", "desc": "string"}`;

            try {
                const result = await geminiModel.generateContent(prompt);
                const response = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
                finalTitre = response.titre;
                finalDesc = response.desc;
            } catch (e) {
                console.log(`❌ Échec IA pour cet ID.`);
                continue;
            }
        }

        if (finalTitre) {
            // MISE À JOUR PRODUCTION
            const { error: prodError } = await supabase
                .from('evenements')
                .update({
                    titre: finalTitre,
                    description_detaillee: finalDesc,
                    donnee_corrigee: false,
                    illustration_url: null // S'assurer que l'image morbide est bien virée
                })
                .eq('id', event.id);

            // MISE À JOUR QUEUE_SEVENT
            const { error: queueError } = await supabase
                .from('queue_sevent')
                .update({ titre: finalTitre })
                .ilike('titre', event.titre); // On cherche par l'ancien titre vague dans la queue

            if (!prodError) console.log(`➔ Restauré : "${finalTitre}"`);
            else console.log(`❌ Erreur Prod: ${prodError.message}`);
        }
    }

    console.log("\n✨ OPÉRATION DE RESTAURATION TERMINÉE EN PRODUCTION.");
}

emergencyRestore();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { calculateNotorietyFR } from '../flux_qpuc/agent_notaire.mjs';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
    console.error("❌ Erreur : Variables d'environnement manquantes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * 📜 AGENT LE GREFFIER (The Registrar)
 * Mission : Prendre les événements bruts du SAS et les enrichir pour l'Antichambre.
 */

async function runGreffier() {
    console.log("📜 [GREFFIER] Lancement du service d'enrichissement...");

    let hasMore = true;
    let totalTraites = 0;

    while (hasMore) {
        // 1. Récupérer les événements du SAS qui ont une image ET qui n'ont pas encore été traités
        const { data: events, error: fetchError } = await supabase
            .from('sas')
            .select('*')
            .not('illustration_url', 'is', null)
            .neq('statut', 'ENVOYE_ANTICHAMBRE')
            .limit(10); // Batch de 10

        if (fetchError) {
            console.error("❌ [GREFFIER] Erreur lors de la lecture du SAS :", fetchError.message);
            return;
        }

        if (!events || events.length === 0) {
            console.log(`📥 [GREFFIER] Aucun événement supplémentaire à traiter. Fin (Total traité: ${totalTraites}).`);
            hasMore = false;
            break;
        }

        console.log(`📊 [GREFFIER] Traitement du lot en cours...`);

        for (const rawEvent of events) {
            console.log(`\n🖋️ Traitement : "${rawEvent.titre}" (${rawEvent.date})`);

            try {
                // Étape 2 : Appel à Gemini pour l'enrichissement
                let enrichedData = await enrichEventWithAI(rawEvent);

                if (enrichedData) {
                    // Étape 2.5 : Calcul propre de la notoriété Wikipédia FR via le Notaire
                    const vraiScoreNotoriete = await calculateNotorietyFR(enrichedData.titre || rawEvent.titre);
                    
                    enrichedData.notoriete_fr = vraiScoreNotoriete;
                    enrichedData.notoriete = vraiScoreNotoriete; // Garder la sync
                    enrichedData.illustration_url = rawEvent.illustration_url;

                    // Étape 3 : Insertion dans l'Antichambre
                    const { error: insertError } = await supabase
                        .from('antichambre')
                        .insert([{
                            ...enrichedData,
                            created_at: new Date(),
                            updated_at: new Date(),
                            statut_validation: 'EN_ATTENTE_VIDEUR'
                        }]);

                    if (insertError) {
                        console.error(`  ❌ [INSERT] Erreur insertion antichambre :`, insertError.message);
                        continue;
                    }

                    // Étape 4 : Marquer comme traité dans le SAS
                    await supabase
                        .from('sas')
                        .update({ statut: 'ENVOYE_ANTICHAMBRE' })
                        .eq('id', rawEvent.id);

                    totalTraites++;
                    console.log(`  ✅ [OK] Événement '${enrichedData.titre}' transféré dans l'Antichambre !`);
                }
            } catch (err) {
                console.error(`  💥 [ERREUR] Échec de l'enrichissement pour "${rawEvent.titre}":`, err.message);
            }
        }
    }
}

async function enrichEventWithAI(event) {
    const prompt = `Tu es Le Greffier, expert en archivage historique et documentation. 
Ta mission est de prendre un événement brut et de le transformer en une fiche de données complète et précise pour un jeu de frise chronologique.

ÉVÉNEMENT BRUT :
TITRE: ${event.titre}
DATE BRUTE: ${event.date}
CONTEXTE: ${event.description || 'N/A'}
THEME: ${event.theme || 'Général'}

INSTRUCTIONS :
1. DESCRIPTION DÉTAILLÉE : Rédige une description de 3 à 5 phrases, passionnante, historique et factuelle.
2. DATE NORMALISÉE : Trouve la date précise au format YYYY-MM-DD. Si tu n'as que l'année, utilise YYYY-01-01.
3. EPOQUE : Détermine l'époque (ex: Antiquité, Moyen Âge, Époque Moderne, Époque Contemporaine).
4. UNIVERSEL : Est-ce un événement d'importance mondiale (true) ou régional (false) ?
5. REGION/PAYS : Si non universel, précise la région ou le pays (ex: 'France').
6. CATEGORIES : Liste 1 à 3 catégories (ex: 'Politique', 'Science', 'Guerre', 'Culture').
7. NOTORIÉTÉ : Score de 0 à 100 (0=inconnu, 100=tout le monde connaît).
8. DIFFICULTÉ : Niveau de 1 à 5 (1=facile, 5=expert).
9. PARAMÈTRES JEU : 
   - ecart_temps_max : Prévoit un écart en années (ex: 50 pour un événement majeur, 10 pour un précis).
   - facteur_variation : Double de 0.5 à 2.0 (défaut 1.0).

Réponds EXCLUSIVEMENT en JSON valide :
{
  "titre": "Titre propre et clair",
  "date": "YYYY-MM-DD",
  "description_detaillee": "Texte enrichi...",
  "universel": boolean,
  "region": "Nom de région ou pays",
  "langue": "français",
  "epoque": "Nom de l'époque",
  "types_evenement": ["Catégorie1", "Catégorie2"],
  "notoriete": number,
  "niveau_difficulte": number,
  "ecart_temps_max": number,
  "facteur_variation": number,
  "date_precision": "day" | "month" | "year"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Nettoyage markdown
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("  Failed to parse AI response:", text);
        return null;
    }
}

runGreffier();

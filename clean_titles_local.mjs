import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// 1. Configuration des clients
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(LOCAL_URL, LOCAL_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function cleanTitles() {
    console.log('🚀 Lancement du nettoyage des titres (Mode Local)...');

    // 2. Récupérer les événements dont le titre est long ou contient des virgules/détails
    // On en prend 50 pour le premier test
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date_formatee')
        .or('titre.ilike.%,%,titre.ilike.% de %,titre.ilike.% du %') // Titres potentiellement longs
        .limit(50);

    if (error) {
        console.error('❌ Erreur lors de la récupération :', error.message);
        return;
    }

    console.log(`📦 ${events.length} événements à analyser.`);

    for (const event of events) {
        const prompt = `Tu es un expert en histoire pour le jeu Kiko. 
        Ta mission : Rendre ce titre d'événement historique plus court, percutant et élégant pour un quiz.
        
        RÈGLES :
        - Supprime les dates (elles sont déjà gérées).
        - Supprime les descriptions inutiles (ex: "future capitale de...").
        - Garde l'essentiel de l'action ou du nom de l'événement.
        - Style : "Sacre de Charlemagne" plutôt que "Le couronnement de l'empereur Charlemagne à Rome".
        - MAX 50 caractères si possible.
        
        TITRE ACTUEL : "${event.titre}"
        DATE : ${event.date_formatee}
        
        Réponds UNIQUEMENT avec le nouveau titre, rien d'autre.`;

        try {
            const result = await model.generateContent(prompt);
            const newTitle = result.response.text().trim().replace(/^"|"$/g, '');

            if (newTitle && newTitle !== event.titre) {
                const { error: updateError } = await supabase
                    .from('evenements')
                    .update({ titre: newTitle })
                    .eq('id', event.id);

                if (updateError) {
                    console.error(`  ❌ Erreur update [${event.id}] :`, updateError.message);
                } else {
                    console.log(`  ✅ ${event.titre}  ==>  [${newTitle}]`);
                }
            } else {
                console.log(`  ℹ️  Inchangé : ${event.titre}`);
            }
        } catch (e) {
            console.error(`  ❌ Erreur IA pour "${event.titre}" :`, e.message);
        }
    }

    console.log('\n✨ Nettoyage des 50 premiers terminé !');
    console.log('Va vérifier ici : http://127.0.0.1:54323/project/default/editor/evenements');
}

cleanTitles();

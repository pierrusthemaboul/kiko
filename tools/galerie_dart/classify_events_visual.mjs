import { createClient } from '@supabase/supabase-js';
import { embedText, getOpenAIClient } from '../machine_a_evenements/tempete/openai.mjs';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CATEGORIES_PROTOTYPES = {
    iconic_object: [
        "iconic historical object artifact invention machine satellite monument",
        "famous historical object like guillotine printing press locomotive artifact",
        "recognizable historical object technology device or artifact"
    ],
    human_emotion: [
        "crowd protest celebration people emotion social movement",
        "people expressing strong emotion joy anger revolution celebration",
        "human crowd gathering protest demonstration celebration"
    ],
    science_discovery: [
        "scientific discovery laboratory experiment research breakthrough",
        "scientist experiment laboratory physics chemistry medicine",
        "scientific breakthrough research laboratory innovation"
    ],
    exploration: [
        "exploration expedition discovery new lands space exploration",
        "astronaut voyage exploration navigation discovery",
        "historic exploration journey expedition discovery"
    ],
    architecture: [
        "historic building architecture monument landmark construction",
        "famous building cathedral castle skyscraper architecture",
        "historic architecture monument building landmark"
    ],
    industrial_scene: [
        "industrial revolution factory machinery production industry",
        "factory industrial machinery engineering manufacturing",
        "industrial technology production machine industry"
    ],
    battle_conflict: [
        "battle war soldiers military conflict battlefield army",
        "historic war military battle soldiers weapons army",
        "battlefield military conflict soldiers war scene"
    ],
    symbolic_scene: [
        "symbolic environmental protection diplomacy treaty global agreement",
        "international treaty diplomacy environmental conservation",
        "symbolic global agreement nature protection diplomacy"
    ],
    cultural_event: [
        "art cinema music literature painting culture museum",
        "cultural movement art cinema music cultural history",
        "important cultural event art literature music"
    ],
    political_event: [
        "political speech parliament election government politics",
        "historic political event revolution parliament leader",
        "government political decision parliament speech"
    ]
};

// Dot product utility (cosine similarity if vectors are normalized)
function dotProduct(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return -1;
    let dp = 0;
    for (let i = 0; i < vecA.length; i++) {
        dp += vecA[i] * vecB[i];
    }
    return dp;
}

async function main() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Supabase config missing");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openaiClient = getOpenAIClient();

    console.log("🚀 Génération des embeddings prototypes (multi-prototypes)...");
    const prototypeEmbeddingsMap = {};
    for (const [name, texts] of Object.entries(CATEGORIES_PROTOTYPES)) {
        console.log(`  - ${name}`);
        prototypeEmbeddingsMap[name] = [];
        for (const text of texts) {
            const vec = await embedText(text, { client: openaiClient, model: 'text-embedding-3-small' });
            prototypeEmbeddingsMap[name].push(vec);
        }
    }

    console.log("📥 Récupération de TOUS les événements (pagination)...");
    let allEvents = [];
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
        console.log(`  - Fetching range ${offset} to ${offset + pageSize - 1}...`);
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, embedding_vocal')
            .range(offset, offset + pageSize - 1)
            .order('id'); // Consistent ordering for pagination

        if (error) {
            console.error("❌ Erreur Supabase:", error);
            process.exit(1);
        }

        if (!data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        
        if (data.length < pageSize) break;
        offset += pageSize;
    }

    console.log(`📊 Classification de ${allEvents.length} événements...`);
    const results = [];
    const stats = Object.keys(CATEGORIES_PROTOTYPES).reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});

    for (const event of allEvents) {
        if (!event.embedding_vocal) {
            // console.warn(`⚠️ Événement sans embedding vocal: ${event.titre} (${event.id})`);
            continue;
        }

        let eventVector;
        try {
            eventVector = typeof event.embedding_vocal === 'string' 
                ? JSON.parse(event.embedding_vocal) 
                : event.embedding_vocal;
        } catch (e) {
            console.error(`❌ Erreur de parsing pour l'événement ${event.id}:`, e);
            continue;
        }

        let maxSimilarityOverall = -1;
        let bestCategory = null;

        for (const [catName, catVectors] of Object.entries(prototypeEmbeddingsMap)) {
            let maxSimilarityForCat = -1;
            
            // Calculate similarity with each prototype of this category and keep the max
            for (const catVec of catVectors) {
                const sim = dotProduct(eventVector, catVec);
                if (sim > maxSimilarityForCat) {
                    maxSimilarityForCat = sim;
                }
            }

            // If this category's best prototype is the overall best, update winner
            if (maxSimilarityForCat > maxSimilarityOverall) {
                maxSimilarityOverall = maxSimilarityForCat;
                bestCategory = catName;
            }
        }

        if (bestCategory) {
            results.push({
                id: event.id,
                titre: event.titre,
                categorie_visuelle: bestCategory,
                confidence: parseFloat(maxSimilarityOverall.toFixed(4))
            });
            stats[bestCategory]++;
        }

        if (results.length % 1000 === 0 && results.length > 0) {
            console.log(`  - ${results.length} classés...`);
        }
    }

    const resultsPath = path.join(__dirname, 'event_visual_categories.json');
    const statsPath = path.join(__dirname, 'visual_category_stats.json');

    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

    console.log(`\n✅ Classification terminée !`);
    console.log(`📄 Résultats : ${resultsPath}`);
    console.log(`📊 Statistiques : ${statsPath}`);
    console.log("\nDistribution :");
    console.table(stats);
}

main().catch(err => {
    console.error("❌ Erreur fatale:", err);
    process.exit(1);
});


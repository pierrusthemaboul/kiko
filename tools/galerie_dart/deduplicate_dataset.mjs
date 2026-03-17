import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Supabase config missing");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

async function main() {
    const datasetPath = path.join(__dirname, 'visual_reference_dataset.json');
    const cleanDatasetPath = path.join(__dirname, 'visual_reference_dataset_clean.json');
    const cleanStatsPath = path.join(__dirname, 'visual_reference_stats_clean.json');

    console.log(`📥 Loading ${datasetPath}...`);
    const dataset = JSON.parse(await fs.readFile(datasetPath, 'utf8'));

    // Extract all IDs
    const allIds = [];
    for (const cat in dataset) {
        allIds.push(...dataset[cat].map(item => item.id));
    }

    console.log(`📥 Fetching embeddings for ${allIds.length} images from Supabase...`);
    const { data: dbData, error } = await supabase
        .from('evenements')
        .select('id, embedding_image')
        .in('id', allIds);

    if (error) {
        console.error("❌ Supabase error:", error);
        process.exit(1);
    }

    const embeddingMap = new Map();
    dbData.forEach(row => {
        if (row.embedding_image) {
            const vec = typeof row.embedding_image === 'string' 
                ? JSON.parse(row.embedding_image) 
                : row.embedding_image;
            embeddingMap.set(row.id, vec);
        }
    });

    console.log("✨ Deduplicating visually similar images (threshold 0.92)...");
    const cleanDataset = {};
    let duplicatesRemoved = 0;
    let totalRemaining = 0;

    for (const [catName, items] of Object.entries(dataset)) {
        console.log(`  - Category: ${catName}`);
        
        // Sort items by score_total descending just in case
        items.sort((a, b) => b.score_total - a.score_total);
        
        const keptItems = [];
        for (const candidate of items) {
            const candVec = embeddingMap.get(candidate.id);
            if (!candVec) {
                keptItems.push(candidate);
                continue;
            }

            let isDuplicate = false;
            for (const existing of keptItems) {
                const existingVec = embeddingMap.get(existing.id);
                if (!existingVec) continue;

                const similarity = cosineSimilarity(candVec, existingVec);
                if (similarity > 0.92) {
                    console.log(`    ⏩ Removing duplicate: "${candidate.titre}" is too similar to "${existing.titre}" (Score: ${candidate.score_total} vs ${existing.score_total}, Sim: ${similarity.toFixed(3)})`);
                    isDuplicate = true;
                    duplicatesRemoved++;
                    break;
                }
            }

            if (!isDuplicate) {
                keptItems.push(candidate);
            }
        }
        
        cleanDataset[catName] = keptItems;
        totalRemaining += keptItems.length;
    }

    // Save cleaned dataset
    await fs.writeFile(cleanDatasetPath, JSON.stringify(cleanDataset, null, 2));

    // Save stats
    const stats = {
        categories: Object.keys(cleanDataset).length,
        total_images: totalRemaining,
        duplicates_removed: duplicatesRemoved
    };
    await fs.writeFile(cleanStatsPath, JSON.stringify(stats, null, 2));

    console.log(`\n✅ Deduplication complete!`);
    console.log(`📄 Cleaned Dataset: ${cleanDatasetPath}`);
    console.log(`📄 Cleaned Stats: ${cleanStatsPath}`);
    console.table(stats);
}

main().catch(err => {
    console.error("❌ Error during deduplication:", err);
});


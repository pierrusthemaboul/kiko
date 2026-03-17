import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("❌ Supabase config missing");
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const inputPath = path.join(__dirname, 'event_visual_categories.json');
    console.log(`📥 Chargement de ${inputPath}...`);
    const classifications = JSON.parse(await fs.readFile(inputPath, 'utf8'));

    console.log(`📥 Récupération des URLs d'illustration depuis Supabase...`);
    
    // Process in batches of 200 to avoid long URLs or heavy queries
    const batchSize = 200;
    const idToUrl = new Map();
    
    for (let i = 0; i < classifications.length; i += batchSize) {
        const batchIds = classifications.slice(i, i + batchSize).map(c => c.id);
        console.log(`  - Batch ${i} à ${Math.min(i + batchSize, classifications.length)}...`);
        
        const { data, error } = await supabase
            .from('evenements')
            .select('id, illustration_url')
            .in('id', batchIds);

        if (error) {
            console.error("❌ Erreur Supabase:", error);
            process.exit(1);
        }

        if (data) {
            data.forEach(row => idToUrl.set(row.id, row.illustration_url));
        }
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log("🧩 Fusion des données et regroupement par catégorie...");
    const merged = classifications.map(c => ({
        id: c.id,
        categorie: c.categorie_visuelle,
        titre: c.titre,
        confidence: c.confidence,
        illustration_url: idToUrl.get(c.id) || null
    }));

    // Sort by category name then by confidence (descending)
    merged.sort((a, b) => {
        if (a.categorie < b.categorie) return -1;
        if (a.categorie > b.categorie) return 1;
        return b.confidence - a.confidence;
    });

    const outputPath = path.join(__dirname, 'visual_category_candidates.json');
    await fs.writeFile(outputPath, JSON.stringify(merged, null, 2));

    console.log(`\n✅ Fichier généré : ${outputPath}`);
    console.log(`📊 Total : ${merged.length} candidats.`);
}

main().catch(err => {
    console.error("❌ Erreur fatale:", err);
    process.exit(1);
});


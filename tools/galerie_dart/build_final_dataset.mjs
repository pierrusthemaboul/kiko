import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const scoresPath = path.join(__dirname, 'image_scores_full.json');
    const datasetPath = path.join(__dirname, 'visual_reference_dataset.json');
    const statsPath = path.join(__dirname, 'visual_reference_stats.json');

    console.log(`📥 Loading ${scoresPath}...`);
    const data = JSON.parse(await fs.readFile(scoresPath, 'utf8'));

    // Step 1: Filter out errors
    const validItems = data.filter(item => !item.error);
    console.log(`✅ Filtered ${data.length - validItems.length} errors. ${validItems.length} valid images left.`);

    // Step 2: Group by category
    const categoriesMap = {};
    for (const item of validItems) {
        if (!categoriesMap[item.categorie]) {
            categoriesMap[item.categorie] = [];
        }
        categoriesMap[item.categorie].push(item);
    }

    const referenceDataset = {};
    let totalImages = 0;

    // Step 3 & 4: Sort and Pick Top 10
    console.log("🎯 Selecting top 10 images per category...");
    for (const [catName, items] of Object.entries(categoriesMap)) {
        // Sort by score_total descending
        items.sort((a, b) => b.scores.score_total - a.scores.score_total);

        // Take top 10
        const top10 = items.slice(0, 10).map(item => ({
            id: item.id,
            titre: item.titre,
            illustration_url: item.illustration_url,
            score_total: parseFloat(item.scores.score_total.toFixed(2))
        }));

        referenceDataset[catName] = top10;
        totalImages += top10.length;
        console.log(`  - ${catName}: ${top10.length} images selected (Top score: ${top10[0]?.score_total})`);
    }

    // Step 5: Save Dataset
    await fs.writeFile(datasetPath, JSON.stringify(referenceDataset, null, 2));

    // Step 6: Save Stats
    const stats = {
        categories: Object.keys(referenceDataset).length,
        images_per_category: 10,
        total_reference_images: totalImages
    };
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

    console.log(`\n🎉 Final Reference Dataset Created!`);
    console.log(`📄 Dataset: ${datasetPath}`);
    console.log(`📄 Stats: ${statsPath}`);
}

main().catch(err => {
    console.error("❌ Error during dataset creation:", err);
});


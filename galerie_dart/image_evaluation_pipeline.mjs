import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!GEMINI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Configuration manquante (GEMINI_KEY, SUPABASE_URL ou SUPABASE_KEY)");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility: Cosine Similarity
function dotProduct(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dp = 0;
    for (let i = 0; i < vecA.length; i++) {
        dp += vecA[i] * vecB[i];
    }
    return dp;
}

async function downloadImageAsBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const buffer = await response.arrayBuffer();
        return {
            base64Content: Buffer.from(buffer).toString('base64'),
            mimeType: response.headers.get('content-type') || 'image/webp'
        };
    } catch (e) {
        throw new Error(`Download failed: ${e.message}`);
    }
}

async function evaluateImageWithGemini(base64Data, mimeType, titre) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are evaluating an illustration for a mobile history game about the event: "${titre}".
Players see the image briefly and must recognize the historical subject very quickly.
The image must therefore be understandable in less than one second on a smartphone screen.
Evaluate the image from 0 to 10 on the following criteria.

CRITERIA
scannability: How instantly recognizable is the main subject?
dominant_subject: Is there a strong central object or subject occupying a large portion of the image?
visual_impact: Is the image visually striking and memorable?
historical_clarity: Does the image clearly evoke a historical event or historical context?
mobile_readability: Would the image remain clear and readable on a small smartphone display?

EVALUATION RULES
Reward images with:
- a clear central subject
- iconic historical objects
- strong silhouette or contrast
- simple composition
Penalize images with:
- crowded scenes
- meetings or people around tables
- generic laboratory scenes
- too many small details
- unclear visual focus

Return ONLY valid JSON in this format:
{
  "scannability": number,
  "dominant_subject": number,
  "visual_impact": number,
  "historical_clarity": number,
  "mobile_readability": number,
  "score_total": number
}

score_total must be the average of the five criteria (sum of criteria divided by 5).`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        }
    ]);

    const text = result.response.text();
    // Clean JSON if needed
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanJson);
}

async function main() {
    // 1. Load Candidates
    console.log("📥 Loading visual_category_candidates.json...");
    const candidates = JSON.parse(await fs.readFile(path.join(__dirname, 'visual_category_candidates.json'), 'utf8'));

    // 2. Pre-selection
    console.log("🎯 Pre-selecting top 30 per category...");
    const categories = [...new Set(candidates.map(c => c.categorie))];
    let selected = [];
    for (const cat of categories) {
        const catItems = candidates.filter(c => c.categorie === cat)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 30);
        selected.push(...catItems);
    }
    console.log(`✅ Selected ${selected.length} candidates for analysis.`);

    // 3. Fetch embedding_image from Supabase for these IDs
    console.log("📥 Fetching embedding_image for selected candidates...");
    const selectedIds = selected.map(s => s.id);
    const { data: dbData, error } = await supabase
        .from('evenements')
        .select('id, embedding_image')
        .in('id', selectedIds);

    if (error) throw error;
    const itemExtraMap = new Map();
    dbData.forEach(row => {
        itemExtraMap.set(row.id, row.embedding_image);
    });

    // 4. Batch Process Gemini Evaluation
    console.log("📸 Starting Gemini Vision analysis (batch of 20)...");
    const imageScores = [];
    const batchSize = 25; // Adjusted a bit since flash is fast

    for (let i = 0; i < selected.length; i += batchSize) {
        const batch = selected.slice(i, i + batchSize);
        console.log(`🚀 Processing batch ${i/batchSize + 1} (${i} to ${Math.min(i + batchSize, selected.length)})...`);
        
        const promises = batch.map(async (item) => {
            if (!item.illustration_url) return null;
            try {
                const { base64Content, mimeType } = await downloadImageAsBase64(item.illustration_url);
                const evaluation = await evaluateImageWithGemini(base64Content, mimeType, item.titre);
                
                return {
                    id: item.id,
                    titre: item.titre,
                    categorie: item.categorie,
                    illustration_url: item.illustration_url,
                    embedding_image: itemExtraMap.get(item.id),
                    scores: evaluation
                };
            } catch (e) {
                console.error(`❌ Error on ${item.titre}: ${e.message}`);
                return null;
            }
        });

        const results = await Promise.all(promises);
        imageScores.push(...results.filter(r => r !== null));
        
        // Write intermediate results
        await fs.writeFile(path.join(__dirname, 'image_scores.json'), JSON.stringify(imageScores, null, 2));
    }

    // 5. Quality Filtering
    console.log("🧹 Filtering by quality...");
    const filtered = imageScores.filter(item => 
        item.scores.score_total >= 6 && 
        item.scores.dominant_subject >= 5
    );
    console.log(`✅ ${filtered.length} images passed quality filters.`);

    // 6. Visual Diversity (Deduplication)
    console.log("✨ Applying visual diversity (deduplication)...");
    const finalSelectionMap = {}; // category -> items

    // Group filtered items by category
    const filteredByCat = {};
    for (const item of filtered) {
        if (!filteredByCat[item.categorie]) filteredByCat[item.categorie] = [];
        filteredByCat[item.categorie].push(item);
    }

    const referenceImages = {};

    for (const cat of Object.keys(filteredByCat)) {
        console.log(`  - Processing ${cat}...`);
        const catItems = filteredByCat[cat].sort((a, b) => b.scores.score_total - a.scores.score_total);
        const uniqueItems = [];

        for (const candidate of catItems) {
            if (!candidate.embedding_image) {
                uniqueItems.push(candidate);
                continue;
            }

            const candVec = typeof candidate.embedding_image === 'string' 
                ? JSON.parse(candidate.embedding_image) 
                : candidate.embedding_image;

            let isDuplicate = false;
            for (const existing of uniqueItems) {
                if (!existing.embedding_image) continue;
                const existingVec = typeof existing.embedding_image === 'string' 
                    ? JSON.parse(existing.embedding_image) 
                    : existing.embedding_image;

                const similarity = dotProduct(candVec, existingVec);
                if (similarity > 0.92) {
                    isDuplicate = true;
                    // console.log(`      ⏩ Skipping duplicate: ${candidate.titre} is similar to ${existing.titre} (sim: ${similarity.toFixed(3)})`);
                    break;
                }
            }

            if (!isDuplicate) {
                uniqueItems.push(candidate);
            }
        }

        // Keep top 10
        referenceImages[cat] = uniqueItems.slice(0, 10).map(u => ({
            id: u.id,
            titre: u.titre,
            confidence: u.scores.score_total,
            illustration_url: u.illustration_url
        }));
    }

    // 7. Save Final Results
    await fs.writeFile(path.join(__dirname, 'reference_images_candidates.json'), JSON.stringify(referenceImages, null, 2));
    console.log("\n🎉 Pipeline completed!");
    console.log(`📄 Quality Scores: ${path.join(__dirname, 'image_scores.json')}`);
    console.log(`📄 Final Selection: ${path.join(__dirname, 'reference_images_candidates.json')}`);
}

main().catch(err => {
    console.error("❌ Fatal Pipeline Error:", err);
});

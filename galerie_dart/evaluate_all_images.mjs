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

if (!GEMINI_KEY) {
    console.error("❌ GEMINI_API_KEY manquante dans le .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

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
    
    const prompt = `You are evaluating an illustration for a mobile history game.
Event Title: "${titre}"

Players see the image for a few seconds and must recognize the historical subject instantly.
The image must be understandable in less than one second on a smartphone screen.

Score the image from 0 to 10 for the following criteria:
scannability
dominant_subject
visual_impact
historical_clarity
mobile_readability

Return ONLY valid JSON:
{
 "scannability": number,
 "dominant_subject": number,
 "visual_impact": number,
 "historical_clarity": number,
 "mobile_readability": number
}`;

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
    const cleanJson = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(cleanJson);
}

async function main() {
    console.log("🚀 Starting Full Image Evaluation Pipeline...");
    
    // 1. Load Data
    const inputPath = path.join(__dirname, 'visual_category_candidates.json');
    const fullScoresPath = path.join(__dirname, 'image_scores_full.json');
    const statsPath = path.join(__dirname, 'image_scores_stats.json');

    const candidates = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    console.log(`📊 Total images to analyze: ${candidates.length}`);

    // Resume capability: if file exists, load it
    let results = [];
    try {
        const existingData = await fs.readFile(fullScoresPath, 'utf8');
        results = JSON.parse(existingData);
        console.log(`🔄 Resume: ${results.length} images already processed. Continuing...`);
    } catch (e) {
        console.log("🆕 Starting from scratch.");
    }

    const processedIds = new Set(results.map(r => r.id));
    const toProcess = candidates.filter(c => !processedIds.has(c.id));

    const batchSize = 20;
    const delayBetweenBatches = 1000;

    for (let i = 0; i < toProcess.length; i += batchSize) {
        const batch = toProcess.slice(i, i + batchSize);
        console.log(`🚀 Processing batch ${Math.floor(i / batchSize) + 1} (${results.length + 1} to ${Math.min(results.length + batchSize, candidates.length)})...`);
        
        const batchPromises = batch.map(async (item) => {
            try {
                if (!item.illustration_url) throw new Error("Missing URL");
                
                const { base64Content, mimeType } = await downloadImageAsBase64(item.illustration_url);
                const evalResult = await evaluateImageWithGemini(base64Content, mimeType, item.titre);
                
                const scores = {
                    ...evalResult,
                    score_total: (evalResult.scannability + evalResult.dominant_subject + evalResult.visual_impact + evalResult.historical_clarity + evalResult.mobile_readability) / 5
                };

                return {
                    id: item.id,
                    titre: item.titre,
                    categorie: item.categorie,
                    illustration_url: item.illustration_url,
                    scores
                };
            } catch (e) {
                console.warn(`⚠️ Error on [${item.titre}]: ${e.message}`);
                return {
                    id: item.id,
                    titre: item.titre,
                    categorie: item.categorie,
                    illustration_url: item.illustration_url,
                    error: true,
                    errorMessage: e.message
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Save progress after each batch
        await fs.writeFile(fullScoresPath, JSON.stringify(results, null, 2));

        // Wait between batches
        if (i + batchSize < toProcess.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }

        // Periodically update stats
        await generateStats(results, statsPath);
    }

    console.log("\n✅ Pipeline Finished!");
    await generateStats(results, statsPath);
}

async function generateStats(results, statsPath) {
    const successItems = results.filter(r => !r.error);
    const errorCount = results.length - successItems.length;
    
    const stats = {
        total_analyzed: results.length,
        success_count: successItems.length,
        error_count: errorCount,
        global_average_score: successItems.length > 0 
            ? successItems.reduce((acc, curr) => acc + curr.scores.score_total, 0) / successItems.length 
            : 0,
        score_distribution: {
            "0-2": successItems.filter(r => r.scores.score_total < 2).length,
            "2-4": successItems.filter(r => r.scores.score_total >= 2 && r.scores.score_total < 4).length,
            "4-6": successItems.filter(r => r.scores.score_total >= 4 && r.scores.score_total < 6).length,
            "6-8": successItems.filter(r => r.scores.score_total >= 6 && r.scores.score_total < 8).length,
            "8-10": successItems.filter(r => r.scores.score_total >= 8).length
        }
    };

    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
}

main().catch(err => {
    console.error("❌ Pipeline Crash:", err);
});

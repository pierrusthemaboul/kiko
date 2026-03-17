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

async function auditImageWithEcoleDArt(base64Data, mimeType, titre, ecoleDArtContent) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are the Expert Art Critic and Legal Advisor for the game Timalaus. 
Your mission is to RE-EVALUATE an illustration for the historical event: "${titre}".
We have updated our "Ecole d'Art" rules to be less rigid and more focused on artistic power.

BELOW ARE THE UPDATED RULES OF THE "ECOLE D'ART TIMALAUS":
${ecoleDArtContent}

EVALUATION PROCESS:
1. ARTISTIC SOUL: Does the image have a strong visual impact (dramatic lighting, deep blacks allowed)?
2. SCANNABILITY: Can a player identify the subject in < 1 second?
3. JUSTIFIED CROWD: If there are many people, is it justified by the event (revolution, etc.) or just a boring meeting?
4. REAL LEGAL RISK: Only flag if there are recognizable contemporary logos or photo-realistic portraits of modern celebrities (<70 years dead). Historical/stylized faces (Jesus, Napoleon, etc.) are explicitly ALLOWED.

VERDICT OPTIONS:
- "KEEP — [Reason]": Excellent image, artistic and clear.
- "IMPROVE — [Reason]": Good base but could be more "epic" or clearer.
- "REPLACE — [Reason]": Actually boring (meeting/contract) or has real legal brands.

Return ONLY a JSON object:
{
  "verdict": "KEEP/IMPROVE/REPLACE",
  "reason": "Short explanation in French focusing on why it changed (or not) with new rules",
  "scores": {
    "scannability": number(0-10),
    "dominance": number(0-10),
    "artistic_impact": number(0-10)
  }
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
    const inputPath = path.join(__dirname, 'visual_reference_dataset_clean.json');
    const ecolePath = path.join(__dirname, 'ecole_d_art.md');
    
    console.log("📖 Reading UPDATED Ecole d'Art rules...");
    const ecoleContent = await fs.readFile(ecolePath, 'utf8');
    
    console.log("📥 Loading dataset...");
    const rawData = await fs.readFile(inputPath, 'utf8');
    const dataset = JSON.parse(rawData);
    
    let reevalCount = 0;
    const categories = Object.keys(dataset);

    for (const cat of categories) {
        for (let i = 0; i < dataset[cat].length; i++) {
            const item = dataset[cat][i];
            
            // On ne rejuge QUE les REPLACE
            if (item.validation_ref && item.validation_ref.startsWith('REPLACE')) {
                console.log(`\n⚖️ Re-evaluating: ${item.titre}...`);
                try {
                    const { base64Content, mimeType } = await downloadImageAsBase64(item.illustration_url);
                    const audit = await auditImageWithEcoleDArt(base64Content, mimeType, item.titre, ecoleContent);
                    
                    const oldVerdict = item.validation_ref;
                    dataset[cat][i].validation_ref = `${audit.verdict} — ${audit.reason}`;
                    dataset[cat][i].score_total = (audit.scores.scannability + audit.scores.dominance + audit.scores.artistic_impact) / 3;
                    
                    console.log(`   OLD: ${oldVerdict.substring(0, 50)}...`);
                    console.log(`   NEW: ${dataset[cat][i].validation_ref}`);
                    reevalCount++;
                } catch (e) {
                    console.error(`   ❌ Error: ${e.message}`);
                }
                
                // Sauvegarde progressive
                await fs.writeFile(inputPath, JSON.stringify(dataset, null, 2));
            }
        }
    }

    console.log(`\n✅ Finished! ${reevalCount} images were re-evaluated.`);
}

main().catch(err => console.error(err));


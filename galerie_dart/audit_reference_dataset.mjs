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
    console.error("❌ GEMINI_API_KEY manquante");
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

async function auditImageWithEcoleDArt(base64Data, mimeType, titre, ecoleDArtContent) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `You are the Expert Art Critic and Legal Advisor for the game Timalaus. 
Your mission is to audit an illustration for the historical event: "${titre}".

BELOW ARE THE STRICT RULES OF THE "ECOLE D'ART TIMALAUS" (MANDATORY):
${ecoleDArtContent}

EVALUATION PROCESS:
1. SCANNABILITY: Can a player identify the subject in < 1 second on a mobile screen?
2. DOMINANT SUBJECT: Does the main object/action occupy > 40% of the frame? 
3. UNIQUE INDEX: Is there a specific visual cue (not a generic meeting/crowd)?
4. BRIGHTNESS: Is it vibrant and clear (NOT too dark or sepia)?
5. LEGAL: Any visible logos, famous faces (portraits), or protected architecture?

VERDICT OPTIONS:
- "KEEP — [Reason]": Perfect image, follows all rules.
- "IMPROVE — [Reason]": Good base but lacks focus, too dark, or needs more unique index.
- "REPLACE — [Reason]": Violates major rules (generic crowd, meeting, legal risk, unreadable).

Return ONLY a JSON object:
{
  "verdict": "KEEP/IMPROVE/REPLACE",
  "reason": "Short explanation in French focusing on Ecole d'Art rules",
  "scores": {
    "scannability": number(0-10),
    "dominance": number(0-10),
    "clarity": number(0-10)
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
    
    console.log("📖 Reading Ecole d'Art rules...");
    const ecoleContent = await fs.readFile(ecolePath, 'utf8');
    
    console.log("📥 Reading current dataset...");
    const dataset = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    
    const categories = Object.keys(dataset);
    let totalProcessed = 0;

    for (const cat of categories) {
        console.log(`\n--- 📂 Section: ${cat} ---`);
        for (let i = 0; i < dataset[cat].length; i++) {
            const item = dataset[cat][i];
            console.log(`⭐ [${totalProcessed + 1}] Auditing: ${item.titre}...`);
            
            try {
                const { base64Content, mimeType } = await downloadImageAsBase64(item.illustration_url);
                const audit = await auditImageWithEcoleDArt(base64Content, mimeType, item.titre, ecoleContent);
                
                // Update the verification reference
                dataset[cat][i].validation_ref = `${audit.verdict} — ${audit.reason}`;
                dataset[cat][i].score_total = (audit.scores.scannability + audit.scores.dominance + audit.scores.clarity) / 3;
                
                console.log(`   Result: ${dataset[cat][i].validation_ref}`);
            } catch (e) {
                console.error(`   ❌ Error on ${item.titre}: ${e.message}`);
            }
            totalProcessed++;
            
            // Periodically save to avoid losing work
            await fs.writeFile(inputPath, JSON.stringify(dataset, null, 2));
        }
    }

    console.log("\n✅ Audit complete! visual_reference_dataset_clean.json has been updated.");
}

main().catch(err => {
    console.error("❌ Fatal Error:", err);
});

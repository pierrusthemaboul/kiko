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

const TARGET_TITLES = [
    "Inauguration du Burj Khalifa à Dubaï",
    "Inauguration de la Pyramide du Louvre",
    "Bataille de Passchendaele",
    "Guerre du Vietnam",
    "Offensive Michael du général Ludendorff sur le front occidental",
    "Tragique embrasement de Notre-Dame de Paris, choc international.",
    "Ouverture d'Euro Disney",
    "Passage au nouveau millénaire",
    "Naufrage du Costa Concordia",
    "La Révolution culturelle en Chine",
    "L'Argentine de Messi remporte la Coupe du Monde au Qatar",
    "Le suicide collectif de Jonestown",
    "L'équipe de France triomphe à la Coupe du monde de football en Russie",
    "Mai 68 en France",
    "Création du franc",
    "Mise en service de la centrale d'Obninsk"
];

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
We apply the "PEINTURE VS POWERPOINT" philosophy.

BELOW ARE THE UPDATED RULES OF THE "ECOLE D'ART TIMALAUS":
${ecoleDArtContent}

EVALUATION PROCESS (CRITICAL):
1. THE POWERPOINT TEST: Does the image look like a corporate PowerPoint, a boring meeting, or a generic stock office photo? If YES, REPLACE.
2. THE MOVIE TEST: Does the image look like a cinematic shot, an epic painting, or a powerful historical atmosphere? If YES, KEEP.
3. SCANNABILITY: Can we understand the topic/emotion in < 1s?
4. REAL LEGAL RISK: Only flag actual modern corporate logos or photo-realistic portraits of living celebrities. DO NOT flag historical figures, stylized faces, or famous architecture if it serves the art.

NOTE ON CROWDS: A crowd of soldiers in the mud, a crowd of citizens in a revolution, or a crowd of pilgrims is NOT a boring meeting. It's an atmosphere. KEEP it if it's epic.

Return ONLY a JSON object:
{
  "verdict": "KEEP/IMPROVE/REPLACE",
  "reason": "Explication en français basée sur le test du PowerPoint (Art vs Bureau)",
  "scores": {
    "scannability": number(0-10),
    "artistic_power": number(0-10)
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
    
    console.log("📥 Loading dataset...");
    const dataset = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    
    let reevalCount = 0;
    const categories = Object.keys(dataset);

    for (const cat of categories) {
        for (let i = 0; i < dataset[cat].length; i++) {
            const item = dataset[cat][i];
            
            // On ne rejuge QUE les 16 ciblés
            if (TARGET_TITLES.includes(item.titre)) {
                console.log(`\n⚖️ Re-evaluating (PowerPoint Test): ${item.titre}...`);
                try {
                    const { base64Content, mimeType } = await downloadImageAsBase64(item.illustration_url);
                    const audit = await auditImageWithEcoleDArt(base64Content, mimeType, item.titre, ecoleContent);
                    
                    dataset[cat][i].validation_ref = `${audit.verdict} — ${audit.reason}`;
                    dataset[cat][i].score_total = (audit.scores.scannability + audit.scores.artistic_power) / 2;
                    
                    console.log(`   NEW VERDICT: ${dataset[cat][i].validation_ref}`);
                    reevalCount++;
                } catch (e) {
                    console.error(`   ❌ Error: ${e.message}`);
                }
                
                await fs.writeFile(inputPath, JSON.stringify(dataset, null, 2));
            }
        }
    }

    console.log(`\n✅ Finished re-evaluating the 16 targets.`);
}

main().catch(err => console.error(err));


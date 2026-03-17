import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function inspectImage(imageUrl, eventTitle, eventYear) {
    console.log(`   ⚖️  Inspection Veritas : ${eventTitle}...`);

    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    const prompt = `You are a Strict Historical Quality Inspector for a mobile game (Kiko).
Analyze this image generated for the event: "${eventTitle}" in year ${eventYear}.

STRICT REJECTION RULES:
1. TEXT: If there is ANY visible text, letters, or clear logos, REJECT.
2. ANACHRONISMS: If there are major anachronisms (e.g., a modern phone in 1800), REJECT. (Be lenient with hairstyles).
3. VIOLENCE: If there are corpses, gore, or raw violence, REJECT.
4. QUALITY: If there are major AI hallucinations (6 fingers, merging limbs), REJECT.

Respond in JSON ONLY:
{
  "isValid": boolean,
  "reason": "Explication courte en français",
  "score": number (0 to 10)
}`;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Image,
                mimeType: "image/webp"
            }
        }
    ]);

    const text = result.response.text();
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
}

async function main() {
    const inputPath = path.join(__dirname, '..', 'PEINTRE', 'STORAGE', 'OUTPUT', 'painting_results.json');
    const outputPath = path.join(__dirname, 'STORAGE/OUTPUT/validation_results.json');

    if (!fs.existsSync(inputPath)) {
        console.error("❌ Pas de résultats de peinture à vérifier.");
        process.exit(1);
    }

    const paintings = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`⚖️ Lancement de l'Agent VERITAS sur ${paintings.length} illustrations.`);

    const validationResults = [];

    for (const item of paintings) {
        try {
            const verification = await inspectImage(item.generated_image_url, item.titre, item.annee);

            validationResults.push({
                ...item,
                veritas_decision: verification.isValid ? 'VALIDATED' : 'REJECTED',
                veritas_reason: verification.reason,
                veritas_score: verification.score
            });

            console.log(`   ${verification.isValid ? '✅' : '❌'} ${verification.reason}`);
        } catch (e) {
            console.error(`   ❌ Erreur d'inspection : ${e.message}`);
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n📦 Rapport de validation sauvegardé dans : ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { inspectImage };


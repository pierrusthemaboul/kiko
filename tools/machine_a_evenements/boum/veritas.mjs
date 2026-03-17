import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Analyse une image pour détecter des anachronismes historiques.
 * @param {string} imageUrl URL de l'image (accessible publiquement ou via buffer)
 * @param {string} titre Titre de l'événement
 * @param {number} year Année de l'événement
 * @param {string} mode Mode d'inspection ('realistic' ou 'symbolic')
 * @returns {Promise<{isValid: boolean, reason: string}>}
 */
export async function inspectImage(imageUrl, titre, year, mode = 'realistic') {
    try {
        console.log(`   ⚖️  Inspection Veritas (Gemini) pour : ${titre} (${year})...`);

        // On récupère l'image en buffer
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        let prompt = '';

        if (mode === 'symbolic') {
            prompt = `You are a Pragmatic Historical Art Critic.
Analyze this symbolic image for "${titre}" in ${year}.

REJECTION RULES:
1. RELEVANCE: Reject if there is NO logical link between the object and the event.
2. REPETITION: We hate compasses ("boussoles") and astrolabes. If you see one and the event is NOT about maritime navigation or stars, REJECT IT.
3. WRITING STYLE: DO NOT reject because the handwriting or calligraphy looks modern. As long as it's a symbolic script, it's fine.
4. QUALITY: Reject ONLY for major AI hallucinations (merging objects, impossible physics).

Respond in JSON format:
"isValid": boolean
"reason": string (Explanation in French)

JSON ONLY.`;
        } else {
            prompt = `You are a Pragmatic Historical Inspector. 
Analyze this realistic image for "${titre}" in ${year}.

BE PRAGMATIC:
- DO NOT reject for modern hairstyles or haircuts. We accept them.
- DO NOT reject for "too clean" or "modern-looking" lighting/photography.
- DO NOT reject military gear unless it's a massive anachronism (e.g., a machine gun in 1200). For the 20th century, be very lenient with tank/vehicle models.

STRICT REJECTION RULES:
1. ABSOLUTE ANACHRONISMS: Only reject for impossible technology (e.g., a phone or electric bulb in 1700, a car in 1500). 
2. NO LARGE CROWDS: We prefer intimate scenes. If the image is a huge, messy crowd where you can't distinguish anything, REJECT IT.
3. HATS: Avoid "Cowboy hats" in historical contexts where they don't belong (like 1789 France).
4. ANATOMY: Reject for gross errors (floating limbs, six fingers, distorted faces).

Respond in JSON format:
"isValid": boolean
"reason": string (Explanation in French)

JSON ONLY.`;
        }

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

    } catch (error) {
        console.error("   ❌ Erreur d'inspection Veritas:", error.message);
        return { isValid: true, reason: "Erreur technique inspection, validation par défaut" };
    }
}


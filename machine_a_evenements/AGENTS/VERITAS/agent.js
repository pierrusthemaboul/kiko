
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';

const agentName = "VERITAS";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function main() {
    const inputPath = path.join(process.cwd(), '../TRINITY/STORAGE/OUTPUT/trinity_result.json');
    if (!fs.existsSync(inputPath)) {
        console.log(`[${agentName}] Aucun résultat de TRINITY trouvé.`);
        return;
    }

    const task = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const { titre, year, imageUrl, description } = task;

    console.log(`[${agentName}] Inspection de l'image pour : ${titre} (${year})`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Tu es VERITAS, un conservateur de musée expert en précision historique.
    Analyse cette image pour l'événement suivant : "${titre}" (${year}).
    Description souhaitée : ${description}

    MISSION : 
    1. Décris ce que tu vois (vêtements, objets, architecture).
    2. Liste les anachronismes (objets modernes, fermetures éclair, lunettes de soleil, voitures).
    3. Vérifie l'absence d'éléments fantastiques (ailes, dragons, magie).
    4. Vérifie si l'atmosphère correspond à l'époque.

    VERDICT CRITIQUE :
    - Rejet immédiat si : smartphone, voiture, avion, plastique visible, montre-bracelet, wings, magie.
    - Rejet si : bâtiment postérieur à l'époque (ex: Tour Eiffel au 17ème).

    FORMAT JSON REQUIS :
    {
      "score": 0-10,
      "isValid": true/false,
      "explanation": "Justification détaillée",
      "inventory": ["liste des éléments vus"],
      "anachronisms": ["liste des erreurs"]
    }`;

    try {
        // Fetch image as base64
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString('base64');

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/webp"
                }
            }
        ]);

        const responseText = result.response.text();
        let jsonText = responseText;
        if (responseText.includes("```json")) {
            jsonText = responseText.match(/```json\s*([\s\S]*?)\s*```/)[1];
        } else if (responseText.includes("{")) {
            const start = responseText.indexOf("{");
            const end = responseText.lastIndexOf("}") + 1;
            jsonText = responseText.substring(start, end);
        }

        const validation = JSON.parse(jsonText);
        const finalResult = {
            ...task,
            validation
        };

        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/veritas_result.json');
        fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2));

        const status = validation.isValid ? 'VALIDATED' : 'REJECTED';
        logDecision(agentName, 'VALIDATE', { titre, year }, status, validation.explanation, { score: validation.score });

    } catch (error) {
        logDecision(agentName, 'VALIDATE', { titre, year }, 'ERROR', error.message);
        process.exit(1);
    }
}

main();

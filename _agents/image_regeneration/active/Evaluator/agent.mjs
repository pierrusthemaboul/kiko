import { askAgent, saveToMemory } from '../../shared_agent_utils.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runEvaluator(event, imageUrl) {
    const instructions = await fs.readFile(path.join(__dirname, 'instructions.md'), 'utf-8');
    
    // TÃ©lÃ©charger l'image pour l'analyse vision
    const imageRes = await fetch(imageUrl);
    const imageData = await imageRes.arrayBuffer();

    const userMessage = `
    Ã‰VÃ‰NEMENT : ${event.titre} (${event.date})
    DESCRIPTION : ${event.description_detaillee || ''}

    MISSION : Analyse cette image et donne ton verdict sÃ©vÃ¨re mais juste.
    VÃ©rifie les anachronismes, le style "AI", et la reconnaissabilitÃ©.
    
    RÃ©ponds UNIQUEMENT en JSON :
    {
        "score_total": "moyenne sur 10",
        "scannability": "note /10",
        "art_style": "note /10",
        "era_accuracy": "note /10",
        "feedback_critique": "pourquoi cette note et quoi changer ?",
        "should_retry": "boolean (true si score < 7)"
    }
    `;

    const response = await askAgent(__dirname, instructions, userMessage, imageData);
    const cleanJson = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    await saveToMemory(__dirname, { eventId: event.id, score: parsed.score_total, feedback: parsed.feedback_critique });
    return parsed;
}

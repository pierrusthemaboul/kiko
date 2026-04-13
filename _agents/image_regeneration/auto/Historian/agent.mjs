import { askAgent, saveToMemory } from '../../shared_agent_utils.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runHistorian(event) {
    const instructions = await fs.readFile(path.join(__dirname, 'instructions.md'), 'utf-8');
    
    const userMessage = `
    Ã‰VÃ‰NEMENT : ${event.titre} (${event.date})
    DESCRIPTION DE BASE : ${event.description_detaillee || ''}

    MISSION : RÃ©dige un rapport historique concis. Qu'est-ce qui se passait VRAIMENT ?
    - Identifie les anachronismes Ã  Ã©viter pour l'annÃ©e ${event.date}.
    - Identifie l'importance de ce moment dans l'histoire.
    
    RÃ©ponds UNIQUEMENT en JSON :
    {
        "rapport_historique": "description concise de la situation rÃ©elle",
        "danger_anachronisme": "technologies ou vÃªtements inexistants Ã  cette date",
        "signification_moment": "pourquoi c'est historique"
    }
    `;

    const response = await askAgent(__dirname, instructions, userMessage);
    const cleanJson = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    await saveToMemory(__dirname, { eventId: event.id, rapport: parsed.rapport_historique });
    return parsed;
}

import { askAgent, saveToMemory } from '../../shared_agent_utils.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runPainter(event, historianReport, artDirectorConcept, legalSafety = false) {
    const instructions = await fs.readFile(path.join(__dirname, 'instructions.md'), 'utf-8');
    const styleGuide = await fs.readFile(path.join(__dirname, '..', '..', 'Style_Expert', 'guide.md'), 'utf-8');
    let legalGuide = '';
    if (legalSafety) {
        try {
            legalGuide = await fs.readFile(path.join(__dirname, '..', '..', 'shared', 'legal_and_image_rights.md'), 'utf-8');
        } catch (e) {
            console.error('Legal guide not found');
        }
    }
    
    const userMessage = `
    Ã‰VÃ‰NEMENT : ${event.titre} (${event.date})
    HISTOIRE : ${historianReport}
    DIRECTION ARTISTIQUE : ${artDirectorConcept}

    ### RÉFÉRENTIELS :
    1. STYLE GUIDE : ${styleGuide}
    ${legalGuide ? `2. SÉCURITÉ JURIDIQUE : ${legalGuide}` : ''}

    MISSION : Produis le prompt technique final pour FLUX (Image Generator).
    - Combine l'Ã¢me artistique avec la prÃ©cision historique.
    - Sois extrÃªmement visuel, technique et dÃ©taillÃ©.
    - Style: CinÃ©matique, textures rÃ©alistes, lumiÃ¨re prÃ©cise.
    
    RÃ©ponds UNIQUEMENT en JSON :
    {
        "medium": "raison du choix du mÃ©dium",
        "flux_prompt": "le prompt de gÃ©nÃ©ration final en ANGLAIS"
    }
    `;

    const response = await askAgent(__dirname, instructions, userMessage);
    const cleanJson = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    await saveToMemory(__dirname, { eventId: event.id, prompt: parsed.flux_prompt });
    return parsed;
}

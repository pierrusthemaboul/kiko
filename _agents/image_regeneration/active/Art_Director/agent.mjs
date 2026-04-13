import { askAgent, saveToMemory } from '../../shared_agent_utils.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runArtDirector(event, historianReport = '', feedback = null, customStyles = [], legalSafety = false) {
    const instructions = await fs.readFile(path.join(__dirname, 'instructions.md'), 'utf-8');
    const styleGuide = await fs.readFile(path.join(__dirname, '..', '..', 'Style_Expert', 'guide.md'), 'utf-8');
    const artSchool = await fs.readFile(path.join(__dirname, '..', '..', 'Art_School', 'rules.md'), 'utf-8');
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
    RAPPORT DE L'HISTORIEN : ${historianReport || 'Aucun rapport spÃ©cifique.'}
    DESCRIPTION DE BASE : ${event.description_detaillee || ''}
    ${feedback ? `\nâš ï¸ Ã‰CHEC PRÃ‰CÃ‰DENT (Score < 7). CRITIQUE : ${feedback}\nAnalysez cet Ã©chec et changez radicalement de stratÃ©gie.` : ''}
    ${customStyles.length > 0 ? `\nðŸŽ¯ CONTRAINTES CRÃ‰ATIVES IMPOSÃ‰ES PAR L'UTILISATEUR : ${customStyles.join(', ')}\nTu DOIS impÃ©rativement construire ton concept autour de ces choix.` : ''}

    ### RÉFÉRENTIELS :
    1. STYLE GUIDE : ${styleGuide}
    2. ÉCOLE D'ART : ${artSchool}
    ${legalGuide ? `3. SÉCURITÉ JURIDIQUE : ${legalGuide}` : ''}

    MISSION : DÃ©finis le concept visuel, le hÃ©ros de l'image et l'Ã©clairage.
    INTERDICTION : Pas de bureaux, pas de paperasse, pas de poignÃ©es de main.
    
    RÃ©ponds UNIQUEMENT en JSON :
    {
        "concept_visuel": "description cinÃ©matique",
        "heros_image": "sujet principal (40% de l'image)",
        "eclairage": "type de lumiÃ¨re",
        "pourquoi_pas_bureau": "explication de l'Ã©vitement du clichÃ©"
    }
    `;

    const response = await askAgent(__dirname, instructions, userMessage);
    const cleanJson = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    await saveToMemory(__dirname, { eventId: event.id, concept: parsed.concept_visuel });
    return parsed;
}

import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// On va reconstruire proprement la fin de la fonction validateImageWithGemini
// On part de la ligne où on parse le JSON (2865 environ) jusqu'au return (2920 environ)

const startIdx = 2865;
const endIdx = 2925; // On va jusqu'au catch

const newLogic = [
    '        let result;',
    '        try {',
    '            result = JSON.parse(jsonText);',
    '        } catch (e) {',
    '            console.warn(`⚠️ [DEBUG] Échec parsing JSON Gemini: ${e.message}`);',
    '            throw new Error(`Invalid JSON from Gemini: ${e.message}`);',
    '        }',
    '',
    '        const da = result.detailedAnalysis || {};',
    '        const finalIsValid = result.isValid === true && result.score >= 7;',
    '        const explanation = result.reason || "Pas d\'explication fournie.";',
    '',
    '        console.log(`🤖 [DEBUG] [CoVe] Inventory: ${JSON.stringify(result.inventory)}`);',
    '        console.log(`🤖 [DEBUG] [CoVe] Verdict: ${finalIsValid} (Score: ${result.score}/10)`);',
    '        console.log(`🤖 [DEBUG] [CoVe] Reason: ${explanation}`);',
    '',
    '        return {',
    '            isValid: finalIsValid,',
    '            score: result.score || 0,',
    '            explanation: explanation,',
    '            detailedAnalysis: {',
    '                ...da,',
    '                inventory: result.inventory,',
    '                analysis: result.analysis,',
    '                score: result.score',
    '            }',
    '        };'
];

lines.splice(startIdx, endIdx - startIdx, ...newLogic);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ validateImageWithGemini logic fully integrated with CoVe approach.');

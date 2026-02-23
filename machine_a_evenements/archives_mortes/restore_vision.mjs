import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// On refait tout le bloc interne à partir de 2815
const startIdx = 2815;
const endIdx = 2858;

const restoredLogic = [
    '    try {',
    '        const responseText = await callGeminiVision(prompt, imageUrl, {',
    '            model: AI_CONFIG.imageValidation,',
    '            maxOutputTokens: 2000,',
    '            temperature: 0.1',
    '        });',
    '',
    '        let jsonText = responseText;',
    '        if (responseText.includes("```json")) {',
    '            const match = responseText.match(/```json\\s*([\\s\\S]*?)\\s*```/);',
    '            if (match) jsonText = match[1];',
    '        } else if (responseText.includes("{")) {',
    '            const startIndex = responseText.indexOf("{");',
    '            const endIndex = responseText.lastIndexOf("}") + 1;',
    '            jsonText = responseText.substring(startIndex, endIndex);',
    '        }',
    '',
    '        const result = JSON.parse(jsonText);',
    '        const da = result.detailedAnalysis || {};',
    '        const finalIsValid = result.isValid === true && (result.score || 0) >= 7;',
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
    '        };',
    '    } catch (error) {',
    '        console.error(`❌ [DEBUG] Erreur validation Gemini Vision: ${error.message}`);',
    '        return {',
    '            isValid: false,',
    '            score: 0,',
    '            explanation: `Erreur technique vision: ${error.message}`,',
    '            detailedAnalysis: { overallValid: false }',
    '        };',
    '    }'
];

lines.splice(startIdx, endIdx - startIdx + 1, ...restoredLogic);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ validateImageWithGemini fully restored and fixed with CoVe.');

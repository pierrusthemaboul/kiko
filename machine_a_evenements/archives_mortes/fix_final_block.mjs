import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// On reconstruit le bloc catch final à partir de 2842
const startIdx = 2842;
const endIdx = 2859;

const fixedCatch = [
    '    } catch (error) {',
    '        console.error(`❌ [DEBUG] Erreur validation Gemini: ${error.message}`);',
    '        return {',
    '            isValid: false,',
    '            score: 0,',
    '            explanation: `Erreur de validation: ${error.message}`,',
    '            detailedAnalysis: {',
    '                overallValid: false',
    '            }',
    '        };',
    '    }'
];

lines.splice(startIdx, endIdx - startIdx + 1, ...fixedCatch);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ Final function structure fixed.');

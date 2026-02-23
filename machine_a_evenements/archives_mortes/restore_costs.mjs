import fs from 'fs';

const filePath = 'c:/Users/Pierre/kiko/machine_a_evenements/sevent3.mjs';
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const costEstimates = [
    'const COST_ESTIMATES = {',
    '    GEMINI_2_FLASH_INPUT: 0.0000001, // per token ($0.10 / 1M)',
    '    GEMINI_2_FLASH_OUTPUT: 0.0000004, // per token ($0.40 / 1M)',
    '    FLUX_SCHNELL: 0.003, // estimate per image',
    '    SHARP_PROCESSING: 0.00001',
    '};',
    ''
];

// On l'insère avant AI_CONFIG (environ ligne 200)
lines.splice(200, 0, ...costEstimates);

fs.writeFileSync(filePath, lines.join('\n'));
console.log('✅ COST_ESTIMATES restored to sevent3.mjs.');

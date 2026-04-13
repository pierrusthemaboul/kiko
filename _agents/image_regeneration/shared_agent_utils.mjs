import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

export async function askAgent(agentDir, systemPrompt, userMessage, imageData = null, modelName = 'gemini-2.0-flash') {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Charger la mémoire
    const memoryPath = path.join(agentDir, 'memory.json');
    let memory = [];
    try {
        const data = await fs.readFile(memoryPath, 'utf-8');
        memory = JSON.parse(data || '[]');
    } catch (e) {
        memory = [];
    }

    // Préparer le contexte (Mémoire vive + Instructions)
    const context = `
    INSTRUCTIONS :
    ${systemPrompt}

    MÉMOIRE RÉCENTE :
    ${JSON.stringify(memory.slice(-5))}
    `;

    const parts = [context, userMessage];
    if (imageData) {
        parts.push({
            inlineData: {
                data: Buffer.from(imageData).toString('base64'),
                mimeType: 'image/webp'
            }
        });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text();

    return responseText;
}

export async function saveToMemory(agentDir, entry) {
    const memoryPath = path.join(agentDir, 'memory.json');
    let memory = [];
    try {
        const data = await fs.readFile(memoryPath, 'utf-8');
        memory = JSON.parse(data);
    } catch (e) {
        memory = [];
    }

    memory.push({
        timestamp: new Date().toISOString(),
        ...entry
    });

    // Garder seulement les 50 derniers éléments
    if (memory.length > 50) memory = memory.slice(-50);

    await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
}

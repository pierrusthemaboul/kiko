import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const AGENTS_DIR = path.join(__dirname, 'agents_illustrateurs');
const ECOLE_ART_FILE = path.join(__dirname, 'ecole_d_art.md');

async function getAgentInstruction(name) {
    return await fs.readFile(path.join(AGENTS_DIR, `${name}.md`), 'utf-8');
}

async function runAgent(agentName, prompt, context = "") {
    const instruction = await getAgentInstruction(agentName);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: instruction });
    const fullPrompt = context ? `CONTEXTE PRÉCÉDENT :\n${context}\n\nREQUÊTE :\n${prompt}` : prompt;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
}

export async function orchestrateIllustration(eventTitre, eventId, outputDir = __dirname) {
    console.log(`\n🚀 Orchestration de l'image : "${eventTitre}" (ID: ${eventId})`);

    try {
        // 1. ARCHIVISTE
        const archReport = await runAgent('archiviste', `Événement : ${eventTitre}`);
        
        // 2. DIRECTEUR ARTISTIQUE
        const artConcept = await runAgent('directeur_artistique', 
            `Transforme ce rapport en un concept cinématique. ÉVITE ABSOLUMENT LE BUREAU.`, 
            archReport
        );

        // 3. PEINTRE EXPERT
        const ecoleArt = await fs.readFile(ECOLE_ART_FILE, 'utf-8');
        const finalPromptResult = await runAgent('peintre_expert', 
            `RÈGLES ÉCOLE D'ART :\n${ecoleArt}\n\nConstruis le prompt final pour FLUX basé sur ce concept.`, 
            `RAPPORT ARCHIVE :\n${archReport}\n\nCONCEPT ART :\n${artConcept}`
        );
        
        const promptMatch = finalPromptResult.match(/<prompt>([\s\S]*?)<\/prompt>/i);
        if (!promptMatch) {
            console.error(`❌ Échec prompt pour ${eventTitre}`);
            return null;
        }
        const fluxPrompt = promptMatch[1].trim();

        // 4. RÉPLICATION FLUX
        const output = await replicate.run("black-forest-labs/flux-schnell", { 
            input: { prompt: fluxPrompt, aspect_ratio: "16:9" } 
        });
        const url = Array.isArray(output) ? output[0] : output;

        // 5. SAUVEGARDE
        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());
        const safeName = eventTitre.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
        const fileName = `${safeName}_${eventId}.png`;
        const savePath = path.join(outputDir, fileName);
        
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(savePath, buffer);
        
        console.log(`✅ Image sauvegardée : ${fileName}`);
        return { id: eventId, titre: eventTitre, url, local_path: savePath, prompt: fluxPrompt };
    } catch (error) {
        console.error(`❌ Erreur pour ${eventTitre}:`, error.message);
        return null;
    }
}

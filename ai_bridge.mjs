
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
    console.error("❌ GEMINI_API_KEY manquante dans le .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// --- DÉFINITION DES OUTILS (FONCTIONS) ---

const tools = {
    ls: async ({ directory = '.' }) => {
        try {
            const files = await fs.readdir(directory, { withFileTypes: true });
            return files.map(f => `${f.isDirectory() ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
        } catch (e) {
            return `Erreur ls: ${e.message}`;
        }
    },
    cat: async ({ filepath }) => {
        try {
            const content = await fs.readFile(filepath, 'utf-8');
            return content.substring(0, 10000); // On limite à 10k caractères pour le contexte
        } catch (e) {
            return `Erreur cat: ${e.message}`;
        }
    },
    cmd: async ({ command }) => {
        console.log(`🛠️ Exécution de la commande : ${command}`);
        return new Promise((resolve) => {
            const child = spawn(command, { shell: true });
            let output = '';
            child.stdout.on('data', Buffer => output += Buffer.toString());
            child.stderr.on('data', Buffer => output += Buffer.toString());
            child.on('close', (code) => {
                resolve(`Sortie (code ${code}):\n${output}`);
            });
        });
    }
};

const toolDeclarations = [
    {
        name: "ls",
        description: "Liste les fichiers et dossiers dans un répertoire.",
        parameters: {
            type: "OBJECT",
            properties: {
                directory: { type: "STRING", description: "Le chemin du dossier à lister." }
            }
        }
    },
    {
        name: "cat",
        description: "Lit le contenu d'un fichier texte.",
        parameters: {
            type: "OBJECT",
            properties: {
                filepath: { type: "STRING", description: "Le chemin du fichier à lire." }
            },
            required: ["filepath"]
        }
    },
    {
        name: "cmd",
        description: "Exécute une commande système (npm, node, etc.) sur l'ordinateur.",
        parameters: {
            type: "OBJECT",
            properties: {
                command: { type: "STRING", description: "La commande à exécuter." }
            },
            required: ["command"]
        }
    }
];

// --- CONFIGURATION DU MODÈLE ---

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ functionDeclarations: toolDeclarations }],
    systemInstruction: `Tu es Antigravity, l'assistant IA de Pierre. 
    Tu as accès à son ordinateur via des outils réels (ls, cat, cmd). 
    Ton but est de l'aider à gérer son projet Kiko.
    
    Règles :
    1. Sois efficace et utilise tes outils pour vérifier tes affirmations.
    2. Pour lister un dossier, utilise ls.
    3. Pour lire un fichier, utilise cat.
    4. Pour lancer un script ou une action, utilise cmd (ex: 'npm run bureau').
    5. Réponds toujours en français, de manière amicale.`
});

let chat = model.startChat({ history: [] });

console.log('🚀 AI Bridge Antigravity (Turbo Mode) démarré...');
console.log('📡 En attente de messages sur Supabase (Table remote_control)...');

// --- BOUCLE DE TRAITEMENT ---

supabase
    .channel('ai_chat_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'remote_control' }, async (payload) => {
        const { type, content, session_id, id } = payload.new;

        if (type === 'ai_query') {
            console.log(`💬 Pierre : ${content}`);

            try {
                let result = await chat.sendMessage(content);
                let response = result.response;

                // Gestion des appels de fonctions en boucle
                let functionCalls = response.functionCalls();

                while (functionCalls && functionCalls.length > 0) {
                    const toolResponses = [];

                    for (const call of functionCalls) {
                        console.log(`⚙️ Appel outil : ${call.name}(${JSON.stringify(call.args)})`);
                        const toolResult = await tools[call.name](call.args);
                        toolResponses.push({
                            functionResponse: {
                                name: call.name,
                                response: { content: toolResult }
                            }
                        });
                    }

                    // Envoyer les résultats des outils au modèle pour continuer la conversation
                    result = await chat.sendMessage(toolResponses);
                    response = result.response;
                    functionCalls = response.functionCalls();
                }

                const finalResponse = response.text();
                console.log(`🤖 Antigravity : ${finalResponse}`);

                await supabase.from('remote_control').insert({
                    type: 'ai_response',
                    content: finalResponse,
                    session_id: session_id
                });

            } catch (e) {
                console.error("❌ Erreur IA:", e);
                await supabase.from('remote_control').insert({
                    type: 'ai_response',
                    content: `Erreur: ${e.message}`,
                    session_id: session_id
                });
            }
        }
    })
    .subscribe();

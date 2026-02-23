
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Remote Listener démarré...');
console.log('📡 En attente de commandes sur Supabase...');

async function logOutput(sessionId, content, type = 'output') {
    await supabase.from('remote_control').insert({
        type,
        content,
        session_id: sessionId,
        status: 'completed'
    });
}

async function setStatus(sessionId, status) {
    await supabase.from('remote_control').insert({
        type: 'status',
        content: status,
        session_id: sessionId,
        status: 'completed'
    });
}

const activeProcesses = new Map();

// Écoute des nouvelles entrées dans remote_control
const channel = supabase
    .channel('remote_commands')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'remote_control' }, async (payload) => {
        const { type, content, session_id } = payload.new;

        if (type === 'command') {
            console.log(`📥 Commande reçue : ${content} (Session: ${session_id})`);
            runCommand(content, session_id);
        } else if (type === 'input') {
            console.log(`⌨️ Input reçu : ${content} (Session: ${session_id})`);
            const proc = activeProcesses.get(session_id);
            if (proc) {
                proc.stdin.write(content + '\n');
            }
        }
    })
    .subscribe();

function runCommand(cmdName, sessionId) {
    let command;
    let args = [];

    if (cmdName === 'bureau') {
        command = 'npm';
        args = ['run', 'bureau'];
    } else if (cmdName === 'chambre') {
        command = 'npm';
        args = ['run', 'chambre_noire'];
    } else if (cmdName === 'migration') {
        command = 'npm';
        args = ['run', 'migrer'];
    } else {
        logOutput(sessionId, `❌ Commande inconnue : ${cmdName}`, 'output');
        return;
    }

    const child = spawn(command, args, {
        shell: true,
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: '0' } // On désactive les couleurs pour les logs
    });

    activeProcesses.set(sessionId, child);

    child.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);
        logOutput(sessionId, text, 'output');

        // Détecter si le script attend une entrée (approximatif mais souvent suffisant)
        if (text.includes('?') || text.toLowerCase().includes('choix')) {
            setStatus(sessionId, 'waiting_input');
        }
    });

    child.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(text);
        logOutput(sessionId, text, 'output');
    });

    child.on('close', (code) => {
        console.log(`✅ Commande terminée avec le code ${code}`);
        setStatus(sessionId, code === 0 ? 'finished_success' : 'finished_error');
        activeProcesses.delete(sessionId);
    });
}

// Keep the process alive
process.stdin.resume();

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Charger la config
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Chemins
const SESSION_FILE = path.join(config.config.storage.input, 'current_session.json');
const LOG_FILE = path.join(config.config.storage.logs, 'agent_runtime.log');

// Logger interne
function log(msg, type = 'INFO') {
    const time = new Date().toISOString();
    const entry = `[${time}] [${type}] ${msg}\n`;
    console.log(entry.trim());
    fs.appendFileSync(LOG_FILE, entry);
}

// Initialisation du fichier de session
let sessionData = [];
if (fs.existsSync(SESSION_FILE)) {
    try {
        sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    } catch (e) {
        log("Erreur lecture session existante, reset.", "WARN");
        sessionData = [];
    }
}

// --- CONFIG GEMINI ---
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: config.config.gemini.model }) : null;

async function analyzeWithGemini(criticalEvent) {
    if (!model) {
        log("Gemini non configuré (clé manquante dans .env)", "WARN");
        return;
    }

    try {
        log("Envoi d'une alerte critique à Gemini...", "ALERT");
        const prompt = `
            Tu es l'agent OBSERVER. Voici un événement critique détecté dans les logs de l'application Kiko :
            ${JSON.stringify(criticalEvent, null, 2)}

            Analyse cette erreur technique (contexte : application mobile React Native / Expo / AdMob) 
            et propose une piste de résolution courte.
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        log(`DIAGNOSTIC GEMINI : ${text}`, "GEMINI");

        const reportPath = path.join(config.config.storage.output, `report_${Date.now()}.md`);
        fs.writeFileSync(reportPath, `# Diagnostic Gemini\n\n## Événement\n\`\`\`json\n${JSON.stringify(criticalEvent, null, 2)}\n\`\`\`\n\n## Analyse\n${text}`);
    } catch (err) {
        log(`Erreur Gemini: ${err.message}`, "ERROR");
    }
}

// --- SERVEUR DE LOGS (HTTP 9091) ---
// Ce serveur reçoit les diffusions directes du LoggerService de l'app
const httpServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/log') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const logEntry = JSON.parse(body);
                logEntry.source = 'app_logger';

                sessionData.push(logEntry);
                fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

                if (logEntry.level === 'error') {
                    log(`Erreur App: ${logEntry.category} - ${logEntry.message}`, "ALERT");
                    analyzeWithGemini(logEntry);
                } else {
                    log(`Log App: [${logEntry.category}] ${logEntry.message}`);
                }

                res.writeHead(200);
                res.end('ok');
            } catch (e) {
                res.writeHead(400);
                res.end('invalid json');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

httpServer.listen(9091, () => {
    log("Serveur de réception de logs démarré sur le port 9091", "SUCCESS");
});

// --- CONNEXION REACTOTRON (WS 9090) ---
// Optionnel : Garder l'écoute passive de Reactotron pour les logs système
const wsUrl = `ws://${config.config.reactotron.host}:${config.config.reactotron.port}`;
let ws;
function connectReactotron() {
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        log("Connecté en passif au serveur Reactotron (9090)", "SUCCESS");
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            if (!message.type || message.type === 'client.intro') return;

            const entry = {
                timestamp: new Date().toISOString(),
                source: 'reactotron',
                type: message.type,
                payload: message.payload
            };

            sessionData.push(entry);
            fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
        } catch (e) { }
    });

    ws.on('close', () => {
        setTimeout(connectReactotron, 10000);
    });

    ws.on('error', () => { });
}

connectReactotron();

// Sauvegarde finale propre sur arrêt
process.on('SIGINT', () => {
    log("Arrêt de l'agent OBSERVER. Archivage de la session...");
    const archivePath = path.join(config.config.storage.output, `session_${Date.now()}.json`);
    fs.copyFileSync(SESSION_FILE, archivePath);
    process.exit();
});

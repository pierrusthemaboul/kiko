import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { startFluxQpucSingleBatch } from '../../tools/flux_qpuc/orchestrator_qpuc.mjs';

console.log("\n🧪 [DIAGNOSTIC ENV] Liste des variables détectées (noms uniquement) :");
console.log(Object.keys(process.env).sort().join(', '));
console.log("--------------------------------------------------\n");

const app = express();

// Configuration CORS complète pour éviter le NetworkError
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://adminweb-ruddy.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (comme les outils locaux ou curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

let globalActiveController = null;

app.post('/api/curateur/rafale', async (req, res) => {
  const { quantity = 10, mode = 'qpuc', theme } = req.body;
  
  console.log(`\n🚀 [API CURATEUR] Nouvelle Rafale : ${quantity} événements (Mode: ${mode}, Thème: ${theme || 'auto'})`);
  
  // Si une rafale est déjà en cours, on l'arrête (ou on peut choisir de refuser)
  if (globalActiveController) {
    globalActiveController.abort();
  }
  globalActiveController = new AbortController();

  // Envoi immédiat des headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendUpdate = (status, message, event = null) => {
    const data = { status, message, event };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendUpdate('log', '🛠️ Initialisation des protocoles IA...');

    await startFluxQpucSingleBatch({
      targetCount: quantity,
      mode: mode,
      theme: theme,
      abortSignal: globalActiveController.signal,
      onEventFound: (event) => {
         sendUpdate('info', `✨ NOUVEL ÉVÉNEMENT VALIDÉ : ${event.titre}`, event);
      },
      onProgress: (msg) => {
         sendUpdate('log', msg);
      }
    });

    if (globalActiveController.signal.aborted) {
        sendUpdate('error', '🛑 Rafale interrompue par le centre de contrôle.');
    } else {
        sendUpdate('done', '🏁 Rafale terminée avec succès.');
    }
    res.end();
  } catch (error) {
     console.error("❌ Erreur Fatigue de la Rafale:", error.message);
     sendUpdate('error', `🔥 ERREUR : ${error.message}`);
     res.end();
  } finally {
    globalActiveController = null;
  }
});

app.post('/api/curateur/stop', (req, res) => {
    if (globalActiveController) {
        console.log("🛑 [API CURATEUR] Signal d'arrêt reçu.");
        globalActiveController.abort();
        res.json({ message: "Signal d'arrêt envoyé au cerveau." });
    } else {
        res.json({ message: "Aucun processus actif à arrêter." });
    }
});

app.listen(PORT, () => {
  console.log(`\n📡 SERVICE CURATEUR IA ACTIF`);
  console.log(`🔗 Interface : http://localhost:${PORT}/api/curateur/rafale`);
  console.log(`📝 Logs de session : Maximisés\n`);
});


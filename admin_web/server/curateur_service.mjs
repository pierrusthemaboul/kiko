import express from 'express';
import cors from 'cors';
import { startFluxQpucSingleBatch } from '../../tools/flux_qpuc/orchestrator_qpuc.mjs';
import 'dotenv/config';

const app = express();

// Configuration CORS complète pour éviter le NetworkError
app.use(cors({
  origin: '*', // Accepter tout en local
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = 3010; // On change car 3005 a peut-être un conflit.

app.post('/api/curateur/rafale', async (req, res) => {
  const { quantity = 10, mode = 'qpuc', theme } = req.body;
  
  console.log(`\n🚀 [API CURATEUR] Nouvelle Rafale : ${quantity} événements (Mode: ${mode}, Thème: ${theme || 'auto'})`);
  
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
      onEventFound: (event) => {
         sendUpdate('info', `✨ NOUVEL ÉVÉNEMENT VALIDÉ : ${event.titre}`, event);
      },
      onProgress: (msg) => {
         // C'est ici qu'on envoie tous les logs des agents en direct vers ton UI
         sendUpdate('log', msg);
      }
    });

    sendUpdate('done', '🏁 Rafale terminée avec succès.');
    res.end();
  } catch (error) {
     console.error("❌ Erreur Fatigue de la Rafale:", error.message);
     sendUpdate('error', `🔥 ERREUR : ${error.message}`);
     res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n📡 SERVICE CURATEUR IA ACTIF`);
  console.log(`🔗 Interface : http://localhost:${PORT}/api/curateur/rafale`);
  console.log(`📝 Logs de session : Maximisés\n`);
});


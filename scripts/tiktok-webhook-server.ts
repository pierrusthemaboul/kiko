/**
 * 🎯 TIKTOK SANDBOX WEBHOOK SERVER
 *
 * Ce script crée un serveur webhook local pour capturer les événements
 * de partage TikTok lors de la démonstration vidéo.
 *
 * UTILISATION :
 * 1. Démarrer le serveur : npx tsx scripts/tiktok-webhook-server.ts
 * 2. Le serveur écoute sur http://localhost:3000
 * 3. Configurer l'URL webhook dans le portail TikTok Developers
 * 4. Lors du clic sur "Partager sur TikTok" dans l'app, le webhook recevra l'événement
 *
 * POUR LA VIDÉO :
 * - Ouvrir un navigateur sur http://localhost:3000/dashboard
 * - Cliquer sur "Partager sur TikTok" dans l'app
 * - Le dashboard affichera l'événement en temps réel
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stockage en mémoire des événements
const events: Array<{
  timestamp: string;
  type: string;
  data: any;
}> = [];

// Charger les credentials TikTok
const tiktokCredentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../tiktok-credentials.json'), 'utf-8')
);

console.log('🎯 TikTok Credentials loaded:');
console.log('   Client Key:', tiktokCredentials.clientKey);
console.log('   App ID:', tiktokCredentials.appId);

/**
 * Endpoint principal pour recevoir les événements de partage
 */
app.post('/webhook/tiktok/share', (req, res) => {
  const timestamp = new Date().toISOString();

  console.log('\n🎉 TIKTOK SHARE EVENT RECEIVED!');
  console.log('⏰ Time:', timestamp);
  console.log('📦 Payload:', JSON.stringify(req.body, null, 2));

  // Enregistrer l'événement
  events.push({
    timestamp,
    type: 'share',
    data: req.body,
  });

  // Répondre avec succès
  res.status(200).json({
    success: true,
    message: 'Share event received successfully',
    timestamp,
  });
});

/**
 * Endpoint pour simuler un événement de partage (pour tester sans l'app)
 */
app.get('/simulate/share', (req, res) => {
  const score = req.query.score || '1250';
  const level = req.query.level || 'Expert';

  const mockEvent = {
    event_type: 'share',
    app_id: tiktokCredentials.appId,
    client_key: tiktokCredentials.clientKey,
    user_id: 'demo_user_123',
    share_data: {
      content_type: 'score',
      title: `Je viens de scorer ${score} sur Timalaus ! 🎯`,
      description: `Niveau atteint : ${level}. Peux-tu faire mieux ?`,
      hashtags: ['#Timalaus', '#QuizTime', '#Histoire'],
      link: 'https://play.google.com/store/apps/details?id=com.pierretulle.juno2',
      score: score,
      level: level,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\n🎭 SIMULATED SHARE EVENT:');
  console.log(JSON.stringify(mockEvent, null, 2));

  events.push({
    timestamp: mockEvent.timestamp,
    type: 'share_simulated',
    data: mockEvent,
  });

  res.status(200).json({
    success: true,
    message: 'Simulated share event created',
    event: mockEvent,
  });
});

/**
 * Dashboard HTML pour visualiser les événements en temps réel
 */
app.get('/dashboard', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎯 TikTok Sandbox Dashboard - Timalaus</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #FF0050 0%, #000000 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
    }
    .header p {
      opacity: 0.9;
      font-size: 16px;
    }
    .credentials {
      background: rgba(255, 255, 255, 0.1);
      padding: 15px;
      border-radius: 10px;
      margin-top: 15px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .credentials strong { color: #FFD700; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 15px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      text-align: center;
      transition: transform 0.3s;
    }
    .stat-card:hover { transform: translateY(-5px); }
    .stat-card .value {
      font-size: 36px;
      font-weight: bold;
      color: #FF0050;
      margin: 10px 0;
    }
    .stat-card .label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .events {
      padding: 30px;
    }
    .events h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #333;
    }
    .event-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      border-left: 5px solid #FF0050;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 10px;
      animation: slideIn 0.5s ease-out;
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .event-type {
      background: #FF0050;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .event-time {
      color: #666;
      font-size: 14px;
    }
    .event-data {
      background: rgba(255, 255, 255, 0.8);
      padding: 15px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .no-events {
      text-align: center;
      padding: 60px 20px;
      color: #999;
      font-size: 18px;
    }
    .refresh-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: linear-gradient(135deg, #FF0050 0%, #000000 100%);
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(255, 0, 80, 0.3);
      transition: transform 0.3s;
    }
    .refresh-btn:hover {
      transform: scale(1.1);
    }
    .simulate-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 15px;
      transition: transform 0.3s;
    }
    .simulate-btn:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span style="font-size: 48px;">🎯</span>
        TikTok Sandbox Dashboard
      </h1>
      <p>Timalaus - Démonstration d'intégration TikTok Share Kit</p>
      <div class="credentials">
        <div><strong>App ID:</strong> ${tiktokCredentials.appId}</div>
        <div><strong>Client Key:</strong> ${tiktokCredentials.clientKey}</div>
        <div><strong>Package:</strong> com.pierretulle.juno2</div>
      </div>
      <button class="simulate-btn" onclick="simulateShare()">
        🎭 Simuler un partage TikTok
      </button>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="label">Total Events</div>
        <div class="value" id="total-events">${events.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Share Events</div>
        <div class="value" id="share-events">${events.filter(e => e.type === 'share').length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Server Status</div>
        <div class="value" style="color: #00C853;">●</div>
      </div>
    </div>

    <div class="events">
      <h2>📊 Événements Récents</h2>
      <div id="events-container">
        ${events.length === 0 ? `
          <div class="no-events">
            <div style="font-size: 64px; margin-bottom: 20px;">⏳</div>
            <div>En attente d'événements de partage TikTok...</div>
            <div style="margin-top: 10px; font-size: 14px; color: #aaa;">
              Cliquez sur "Partager sur TikTok" dans l'app Timalaus
            </div>
          </div>
        ` : events.slice().reverse().map(event => `
          <div class="event-card">
            <div class="event-header">
              <span class="event-type">${event.type}</span>
              <span class="event-time">${new Date(event.timestamp).toLocaleString('fr-FR')}</span>
            </div>
            <div class="event-data">${JSON.stringify(event.data, null, 2)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <button class="refresh-btn" onclick="location.reload()">
    🔄 Rafraîchir
  </button>

  <script>
    // Auto-refresh toutes les 3 secondes
    setInterval(() => {
      fetch('/api/events')
        .then(r => r.json())
        .then(data => {
          document.getElementById('total-events').textContent = data.total;
          document.getElementById('share-events').textContent = data.shares;

          // Mettre à jour la liste si de nouveaux événements
          if (data.total > ${events.length}) {
            location.reload();
          }
        });
    }, 3000);

    function simulateShare() {
      const score = Math.floor(Math.random() * 2000) + 500;
      const levels = ['Débutant', 'Intermédiaire', 'Avancé', 'Expert', 'Maître'];
      const level = levels[Math.floor(Math.random() * levels.length)];

      fetch(\`/simulate/share?score=\${score}&level=\${level}\`)
        .then(r => r.json())
        .then(() => {
          setTimeout(() => location.reload(), 500);
        });
    }
  </script>
</body>
</html>
  `;

  res.send(html);
});

/**
 * API pour récupérer les statistiques
 */
app.get('/api/events', (req, res) => {
  res.json({
    total: events.length,
    shares: events.filter(e => e.type === 'share').length,
    events: events.slice(-10).reverse(),
  });
});

/**
 * Page d'accueil
 */
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

/**
 * Démarrage du serveur
 */
app.listen(PORT, () => {
  console.log('\n🚀 TikTok Sandbox Webhook Server is running!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook/tiktok/share`);
  console.log(`🎭 Simulate: http://localhost:${PORT}/simulate/share`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 INSTRUCTIONS:');
  console.log('1. Ouvrir le dashboard dans un navigateur');
  console.log('2. Lancer l\'app Timalaus sur votre téléphone');
  console.log('3. Jouer une partie et cliquer sur "Partager sur TikTok"');
  console.log('4. L\'événement apparaîtra dans le dashboard\n');
});

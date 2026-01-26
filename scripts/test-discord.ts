import * as fs from 'fs';
import * as path from 'path';

async function testDiscordWebhook() {
  console.log('💬 Test de webhook Discord...\n');

  // Charger le webhook URL
  const webhookPath = path.join(process.cwd(), 'discord-webhook.json');

  if (!fs.existsSync(webhookPath)) {
    console.error('❌ Fichier discord-webhook.json introuvable !');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(webhookPath, 'utf-8'));
  const webhookUrl = config.webhookUrl;

  try {
    console.log('📤 Envoi d\'un message de test sur Discord...');

    // Envoyer un message de test
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: '🎮 **Webhook Discord configuré avec succès !**\n\nLe bot marketing Timalaus est maintenant opérationnel ! 🚀',
        embeds: [
          {
            title: '✅ Test réussi',
            description: 'Ce webhook peut maintenant recevoir des alertes automatiques :',
            color: 0x00ff00, // Vert
            fields: [
              {
                name: '🔔 Alertes disponibles',
                value: '• Nouveaux avis Play Store\n• Milestones atteints\n• Erreurs critiques\n• Rapports quotidiens',
                inline: false,
              },
              {
                name: '📊 Intégrations',
                value: '✅ Twitter\n✅ Discord\n✅ Supabase\n✅ Play Console',
                inline: true,
              },
              {
                name: '🚀 Statut',
                value: 'Opérationnel',
                inline: true,
              },
            ],
            footer: {
              text: 'Timalaus Marketing Bot',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (response.ok) {
      console.log('\n✅ SUCCÈS ! Message envoyé sur Discord !\n');
      console.log('🎉 Vérifiez votre serveur Discord, vous devriez voir le message dans #général\n');
      console.log('📊 Résumé:');
      console.log('   ✅ Webhook configuré');
      console.log('   ✅ Message de test envoyé');
      console.log('   ✅ Prêt pour automation\n');
    } else {
      console.error('❌ Erreur HTTP:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Détails:', errorText);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    process.exit(1);
  }
}

testDiscordWebhook();

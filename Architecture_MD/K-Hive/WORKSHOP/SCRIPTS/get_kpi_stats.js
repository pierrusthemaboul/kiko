import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration fallback (car .env manquant à la racine pour les scripts agents)
const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERREUR: Variables d'environnement SUPABASE manquantes.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDailyStats() {
    const today = new Date().toISOString().split('T')[0];

    console.log(`📊 Récupération des stats pour le ${today}...`);

    // 1. Total Joueurs
    const { count: totalPlayers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 2. Scores du jour (Proxy activité)
    const { data: scores } = await supabase
        .from('game_scores')
        .select('score')
        .gte('created_at', today);

    const gamesPlayedConfig = scores ? scores.length : 0;

    // 3. Rapport Markdown
    const report = `
# 📊 Rapport Quotidien : ${today}

## 📈 Métriques Clés
- **Joueurs Totaux** : ${totalPlayers}
- **Parties Jouées (Auj)** : ${gamesPlayedConfig}

## 🤖 Analyse Automatique
${gamesPlayedConfig > 50 ? "✅ Bonne activité aujourd'hui." : "⚠️ Activité faible. Action requise."}
`;

    // Écriture du rapport pour les agents
    const outputPath = './Architecture_MD/K-Hive/DATA_INBOX/DAILY_REPORT.md';
    // Assurer que le dossier existe
    fs.mkdirSync('./Architecture_MD/K-Hive/DATA_INBOX', { recursive: true });

    fs.writeFileSync(outputPath, report);
    console.log(`✅ Rapport généré : ${outputPath}`);
}

getDailyStats();

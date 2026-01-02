import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script pour exporter les données Supabase en format compatible Looker Studio
 * Génère des fichiers CSV que tu peux importer dans Google Sheets
 */

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OUTPUT_DIR = path.join(__dirname, '..', 'looker-exports');

interface ExportConfig {
  table: string;
  filename: string;
  query?: string;
}

const EXPORTS: ExportConfig[] = [
  {
    table: 'play_console_stats',
    filename: 'play_console_stats.csv',
  },
  {
    table: 'game_scores',
    filename: 'game_scores.csv',
  },
  {
    table: 'evenements',
    filename: 'evenements.csv',
  },
];

async function exportTableToCSV(supabase: any, config: ExportConfig) {
  console.log(`📊 Export ${config.table}...`);

  const { data, error } = await supabase
    .from(config.table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000); // Limite pour éviter exports massifs

  if (error) {
    console.error(`   ❌ Erreur ${config.table}:`, error.message);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`   ⚠️  ${config.table} : Aucune donnée`);
    return null;
  }

  console.log(`   ✅ ${data.length} lignes récupérées`);

  // Convertir en CSV
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...data.map((row: any) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (value === null || value === undefined) return '';
          const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return stringValue.includes(',') || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
        .join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  const outputPath = path.join(OUTPUT_DIR, config.filename);

  // Créer le dossier si n'existe pas
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`   💾 Sauvegardé : ${outputPath}`);

  return outputPath;
}

async function generateAggregatedStats(supabase: any) {
  console.log('\n📈 Génération statistiques agrégées...');

  // Stats quotidiennes des scores
  const { data: dailyScores, error: scoresError } = await supabase.rpc(
    'get_daily_scores_aggregated',
    {}
  ).catch(() => ({ data: null, error: 'Function not found' }));

  // Alternative: Faire l'agrégation côté client
  const { data: scores } = await supabase
    .from('game_scores')
    .select('score, mode, created_at')
    .order('created_at', { ascending: false })
    .limit(10000);

  if (scores && scores.length > 0) {
    // Agréger par jour
    const dailyStats: { [key: string]: { count: number; avgScore: number; maxScore: number } } = {};

    scores.forEach((score: any) => {
      const date = new Date(score.created_at).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, avgScore: 0, maxScore: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].avgScore += score.score;
      dailyStats[date].maxScore = Math.max(dailyStats[date].maxScore, score.score);
    });

    // Calculer moyennes
    const aggregated = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      total_games: stats.count,
      average_score: Math.round(stats.avgScore / stats.count),
      max_score: stats.maxScore,
    }));

    // Export CSV
    const csvRows = [
      'date,total_games,average_score,max_score',
      ...aggregated.map((row) => `${row.date},${row.total_games},${row.average_score},${row.max_score}`),
    ];

    const outputPath = path.join(OUTPUT_DIR, 'daily_aggregated_stats.csv');
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf-8');
    console.log(`   ✅ Stats agrégées : ${outputPath}`);
  }
}

async function main() {
  console.log('🚀 Export Supabase pour Looker Studio\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`📁 Dossier export : ${OUTPUT_DIR}\n`);

  // Export toutes les tables
  for (const config of EXPORTS) {
    await exportTableToCSV(supabase, config);
  }

  // Générer stats agrégées
  await generateAggregatedStats(supabase);

  console.log('\n✅ Export terminé !');
  console.log('\n📋 PROCHAINES ÉTAPES :');
  console.log('1. Va sur Google Sheets : https://sheets.google.com');
  console.log('2. Crée un nouveau fichier : "Timalaus - Supabase Data"');
  console.log('3. Pour chaque CSV :');
  console.log('   - Fichier > Importer > Télécharger > Sélectionne le CSV');
  console.log('   - Crée un onglet par table (play_console_stats, game_scores, etc.)');
  console.log('4. Dans Looker Studio :');
  console.log('   - Create > Data Source > Google Sheets');
  console.log('   - Sélectionne ton fichier Sheets');
  console.log('5. Ajoute cette source au dashboard !');
  console.log(`\n📂 Fichiers exportés dans : ${OUTPUT_DIR}/`);
}

main().catch(console.error);

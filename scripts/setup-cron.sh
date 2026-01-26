#!/bin/bash

# Script d'installation des cron jobs pour Timalaus Marketing Automation
# Ce script configure les tâches automatiques quotidiennes

echo "🚀 Installation des cron jobs Timalaus Marketing..."
echo ""

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Récupérer le chemin absolu du projet
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
echo -e "${BLUE}📁 Répertoire du projet: ${PROJECT_DIR}${NC}"
echo ""

# Vérifier que les fichiers nécessaires existent
echo "🔍 Vérification des fichiers requis..."

if [ ! -f "$PROJECT_DIR/twitter-credentials.json" ]; then
    echo -e "${YELLOW}⚠️  twitter-credentials.json manquant${NC}"
    echo "   Assurez-vous d'avoir configuré Twitter API"
fi

if [ ! -f "$PROJECT_DIR/discord-webhook.json" ]; then
    echo -e "${YELLOW}⚠️  discord-webhook.json manquant${NC}"
    echo "   Assurez-vous d'avoir configuré le webhook Discord"
fi

if [ ! -f "$PROJECT_DIR/kiko-chrono-play-console-c3f0fb35b0b9.json" ]; then
    echo -e "${YELLOW}⚠️  Fichier Play Console manquant${NC}"
fi

echo ""

# Créer le fichier crontab temporaire
CRON_FILE="/tmp/timalaus_cron.txt"

# Sauvegarder le crontab actuel
crontab -l > "$CRON_FILE" 2>/dev/null || echo "# Timalaus Marketing Cron Jobs" > "$CRON_FILE"

# Supprimer les anciennes entrées Timalaus si elles existent
sed -i '/# Timalaus Marketing/d' "$CRON_FILE"
sed -i '/daily-report.ts/d' "$CRON_FILE"
sed -i '/daily-tweet.ts/d' "$CRON_FILE"

# Ajouter les nouveaux cron jobs
echo "" >> "$CRON_FILE"
echo "# Timalaus Marketing - Rapport quotidien (9h00)" >> "$CRON_FILE"
echo "0 9 * * * cd $PROJECT_DIR && /usr/bin/npx tsx scripts/daily-report.ts >> $PROJECT_DIR/logs/daily-report.log 2>&1" >> "$CRON_FILE"
echo "" >> "$CRON_FILE"
echo "# Timalaus Marketing - Tweet quotidien (10h00)" >> "$CRON_FILE"
echo "0 10 * * * cd $PROJECT_DIR && /usr/bin/npx tsx scripts/daily-tweet.ts >> $PROJECT_DIR/logs/daily-tweet.log 2>&1" >> "$CRON_FILE"

# Créer le dossier logs si nécessaire
mkdir -p "$PROJECT_DIR/logs"

# Installer le nouveau crontab
crontab "$CRON_FILE"

echo -e "${GREEN}✅ Cron jobs installés avec succès !${NC}"
echo ""
echo "📅 Tâches programmées:"
echo "  • 09h00 : Rapport quotidien Discord (stats Supabase + Play Console)"
echo "  • 10h00 : Tweet automatique (question du jour)"
echo ""
echo "📝 Logs disponibles dans:"
echo "  • $PROJECT_DIR/logs/daily-report.log"
echo "  • $PROJECT_DIR/logs/daily-tweet.log"
echo ""
echo "💡 Pour voir les cron jobs actifs:"
echo "  crontab -l"
echo ""
echo "💡 Pour désactiver les cron jobs:"
echo "  crontab -e"
echo "  (puis supprimer les lignes Timalaus)"
echo ""
echo "🧪 Pour tester manuellement les scripts:"
echo "  cd $PROJECT_DIR"
echo "  npx tsx scripts/daily-report.ts"
echo "  npx tsx scripts/daily-tweet.ts"
echo ""
echo -e "${GREEN}🎉 Configuration terminée !${NC}"
echo ""
echo "Les tâches automatiques commenceront à s'exécuter demain."
echo "Vous pouvez tester immédiatement avec les commandes ci-dessus."

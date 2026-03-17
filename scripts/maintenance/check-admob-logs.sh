#!/bin/bash

# Script pour vérifier les logs AdMob sur un appareil Android
# Usage: ./scripts/check-admob-logs.sh

echo "=========================================="
echo "🔍 Vérification des logs AdMob"
echo "=========================================="
echo ""

# Vérifier que adb est disponible
if ! command -v adb &> /dev/null; then
    echo "❌ adb n'est pas installé ou n'est pas dans le PATH"
    echo "   Installez Android SDK Platform Tools:"
    echo "   https://developer.android.com/studio/releases/platform-tools"
    exit 1
fi

# Vérifier qu'un appareil est connecté
if ! adb devices | grep -q "device$"; then
    echo "❌ Aucun appareil Android connecté"
    echo ""
    echo "📱 Connectez votre téléphone en USB et activez le débogage USB:"
    echo "   1. Paramètres > À propos du téléphone"
    echo "   2. Appuyez 7 fois sur 'Numéro de build'"
    echo "   3. Paramètres > Options pour les développeurs"
    echo "   4. Activez 'Débogage USB'"
    echo ""
    exit 1
fi

echo "✅ Appareil connecté"
echo ""

# Demander quelle app surveiller
PACKAGE_NAME="com.pierretulle.juno2"
echo "📦 Package: $PACKAGE_NAME"
echo ""

# Offrir un menu
echo "Que voulez-vous faire ?"
echo "1. Voir les logs AdMob en temps réel"
echo "2. Voir les logs du consentement (RGPD)"
echo "3. Voir tous les logs de l'app"
echo "4. Sauvegarder les logs dans un fichier"
echo "5. Tester si l'app est en DEV ou PROD mode"
echo ""
read -p "Votre choix (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🎯 Logs AdMob en temps réel (Ctrl+C pour arrêter):"
        echo "=========================================="
        adb logcat -s "Ads:*" "AdMob:*" "*BANNER_HOME*" "*AdConfig*" "*AdRequest*" | grep --color=auto -E "loaded|failed|error|ERROR|BANNER_HOME"
        ;;
    2)
        echo ""
        echo "🔐 Logs consentement RGPD (Ctrl+C pour arrêter):"
        echo "=========================================="
        adb logcat | grep --color=auto -E "AdConsent|Consent|UMP|GDPR"
        ;;
    3)
        echo ""
        echo "📱 Tous les logs de l'app (Ctrl+C pour arrêter):"
        echo "=========================================="
        adb logcat -s "$PACKAGE_NAME:*"
        ;;
    4)
        LOGFILE="admob_logs_$(date +%Y%m%d_%H%M%S).txt"
        echo ""
        echo "💾 Sauvegarde des logs dans $LOGFILE..."
        echo "   Appuyez sur Ctrl+C après avoir ouvert l'app et navigué"
        echo ""
        adb logcat > "$LOGFILE" &
        LOGCAT_PID=$!
        echo "   Logs en cours d'enregistrement (PID: $LOGCAT_PID)"
        echo "   Appuyez sur Entrée quand vous avez terminé..."
        read
        kill $LOGCAT_PID 2>/dev/null
        echo ""
        echo "✅ Logs sauvegardés dans $LOGFILE"
        echo ""
        echo "📊 Analyse rapide:"
        echo "   - Erreurs AdMob:"
        grep -i "admob.*error\|ads.*error\|banner.*error" "$LOGFILE" | tail -5
        echo "   - Logs de chargement:"
        grep -i "banner_home\|ad loaded\|ad failed" "$LOGFILE" | tail -5
        ;;
    5)
        echo ""
        echo "🔍 Test du mode de l'application..."
        echo "   Ouvrez l'application et attendez 3 secondes..."
        sleep 3
        echo ""
        echo "📊 Recherche de logs de configuration..."
        adb logcat -d | grep -E "adConfig|AdConfig|USE_TEST_IDS|__DEV__|Ad Unit" | tail -10
        echo ""
        echo "   Si vous voyez des IDs commençant par 'ca-app-pub-3940256099942544':"
        echo "   → Mode TEST (pubs de test)"
        echo ""
        echo "   Si vous voyez des IDs commençant par 'ca-app-pub-7809209690404525':"
        echo "   → Mode PRODUCTION (vraies pubs)"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

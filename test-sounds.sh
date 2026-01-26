#!/bin/bash

# Script pour tester différents sons de splash
echo "🎵 Test des sons de splash disponibles"
echo "======================================"
echo ""

cd /home/pierre/kiko/assets/sounds

echo "Sons disponibles:"
echo "1. splash.mp3 (actuel - 8.3K)"
echo "2. splash-new.mp3 (63K)"
echo "3. splash-option2.mp3 (62K)"
echo "4. splash-backup.mp3 (ancien - 17K)"
echo "5. splash_old.mp3 (très ancien - 336K)"
echo ""

read -p "Quel son voulez-vous utiliser? (1-5): " choice

case $choice in
  1)
    echo "✓ Utilisation du son actuel (splash.mp3)"
    ;;
  2)
    echo "Remplacement par splash-new.mp3..."
    cp splash.mp3 splash-temp-backup.mp3
    cp splash-new.mp3 splash.mp3
    echo "✓ Son remplacé!"
    ;;
  3)
    echo "Remplacement par splash-option2.mp3..."
    cp splash.mp3 splash-temp-backup.mp3
    cp splash-option2.mp3 splash.mp3
    echo "✓ Son remplacé!"
    ;;
  4)
    echo "Restauration de l'ancien son (splash-backup.mp3)..."
    cp splash-backup.mp3 splash.mp3
    echo "✓ Son restauré!"
    ;;
  5)
    echo "Utilisation du très ancien son (splash_old.mp3)..."
    cp splash.mp3 splash-temp-backup.mp3
    cp splash_old.mp3 splash.mp3
    echo "✓ Son remplacé!"
    ;;
  *)
    echo "❌ Choix invalide"
    exit 1
    ;;
esac

echo ""
echo "📱 Relancement de l'app pour tester..."
adb shell am force-stop com.timalaus.mobile
sleep 1
adb shell am start -n com.timalaus.mobile/.MainActivity

echo ""
echo "✅ App relancée. Vérifiez si le son joue!"

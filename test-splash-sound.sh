#!/bin/bash

# Script pour tester le son de splash
echo "🎵 Test du son de splash"
echo "========================"
echo ""
echo "Redémarrage de l'app Android..."

# Tuer l'app si elle tourne
adb shell am force-stop com.timalaus.mobile

# Attendre un peu
sleep 2

# Relancer l'app
echo "Lancement de l'app..."
adb shell am start -n com.timalaus.mobile/.MainActivity

# Attendre le démarrage
sleep 3

# Monitorer les logs
echo ""
echo "📱 Logs Android (filtrés pour Audio/Splash):"
echo "============================================"
adb logcat -d | grep -E "\[Splash\]|\[AudioContext\]|\[AudioWebView\]|AudioContext|chromium" | tail -50

echo ""
echo "✅ Test terminé. Vérifiez si vous avez entendu le son."

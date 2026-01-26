#!/bin/bash

echo "=== Configuration Audio pour forcer sur téléphone ==="
echo ""
echo "1. Vérification des processus Chrome qui pourraient capturer l'audio..."

# Tuer tous les processus chrome-remote qui pourraient intercepter l'audio
pkill -f "chrome.*remote.*debug" 2>/dev/null

echo "2. Désactiver le remote debugging Chrome (si actif)..."
adb shell "am force-stop com.android.chrome" 2>/dev/null

echo "3. Configuration audio Android..."
# S'assurer que le mode ne pas déranger est désactivé
adb shell "settings put global zen_mode 0"

# S'assurer que le téléphone n'est pas en mode silencieux
adb shell "settings put system volume_ring 150"
adb shell "settings put system volume_music 15"

echo "4. Tester la lecture d'un son directement sur le téléphone..."
# Jouer un son système pour vérifier que l'audio fonctionne
adb shell "cmd notification post -S bigtext -t 'Test Audio' 'Tag' 'Audio test'" 2>/dev/null

echo ""
echo "✅ Configuration terminée"
echo ""
echo "💡 Astuces supplémentaires :"
echo "   - Vérifiez que le volume MÉDIA de votre téléphone est au maximum"
echo "   - Vérifiez que votre téléphone n'est pas en mode silencieux"
echo "   - Si vous utilisez des écouteurs, débranchez-les et réessayez"
echo "   - Redémarrez l'app après avoir lancé ce script"
echo ""
echo "🔧 Pour voir les logs WebView dans Chrome:"
echo "   1. Ouvrez Chrome sur votre PC"
echo "   2. Allez sur chrome://inspect"
echo "   3. Cherchez votre WebView et cliquez sur 'inspect'"
echo "   4. Dans la console, vous verrez les logs [AudioWebView HTML]"

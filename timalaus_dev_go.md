# Timalaus Mobile - Procédure de Lancement DEV

Ce document contient les instructions exactes pour lancer l'application mobile Kiko (Timalaus) sur l'émulateur Android en mode développement.

## 1. Environnement requis
- **JDK** : `C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot`
- **AVD Name** : `Medium_Phone_API_36.1`
- **Projet** : `C:\Users\Pierre\kiko\mobile_app`

## 2. Étapes de lancement automatique

### Étape A : Nettoyer les anciens processus (Optionnel mais recommandé)
```powershell
taskkill /F /IM node.exe /T
taskkill /F /IM adb.exe /T
```

### Étape B : Démarrer l'émulateur (Arrière-plan)
```powershell
& 'C:\Users\Pierre\AppData\Local\Android\Sdk\emulator\emulator.exe' -avd Medium_Phone_API_36.1 -no-boot-anim -memory 4096 -gpu host
```

### Étape C : Configurer l'environnement et lancer Metro
Se placer dans `C:\Users\Pierre\kiko\mobile_app`.
```powershell
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
$env:EXPO_PUBLIC_APP_VARIANT="development"
npx expo start --localhost --max-workers 4 --clear
```

### Étape D : Lier l'émulateur et lancer l'App
Une fois que Metro a fini son scan (peut être long à cause des 126k fichiers), exécuter :
```powershell
# 1. Reversement des ports
& 'C:\Users\Pierre\AppData\Local\Android\Sdk\platform-tools\adb.exe' reverse tcp:8081 tcp:8081

# 2. Lancement via Intent
& 'C:\Users\Pierre\AppData\Local\Android\Sdk\platform-tools\adb.exe' shell am start -n com.pierretulle.juno2.dev/com.pierretulle.juno2.dev.MainActivity -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "exp+kiko://expo-development-client/?url=http://127.0.0.1:8081"
```

## 3. Notes importantes
- **Patience** : Le premier scan Metro peut prendre 2 à 3 minutes car il surveille toute la racine du projet.
- **Unexpected end of stream** : Si cette erreur apparaît sur l'émulateur, cela signifie que Metro n'a pas fini de scanner. Attendre le QR Code dans Metro et cliquer sur "Reload" sur l'émulateur.

# 📱 Guide de Lancement Mobile (Kiko)

Ce document récapitule les commandes nécessaires pour lancer l'application sur ton téléphone physique (Poco F5) et l'émulateur Android Studio.

## 🛠 1. Configuration Permanente (À faire une fois)

Pour éviter les erreurs Gradle, assure-toi que ton `JAVA_HOME` pointe vers le JDK 21.
Dans une console PowerShell (en administrateur) :
```powershell
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot", "User")
```
*Note : Redémarre ton terminal après avoir lancé cette commande.*

---

## 🧹 2. Commande "Grand Ménage" (En cas de bug)

Si le port 8081 est occupé ou si rien ne charge, lance ceci pour tout réinitialiser :
```powershell
taskkill /F /IM node.exe /T; taskkill /F /IM java.exe /T; adb kill-server; adb start-server
```

---

## 🚀 3. Lancer le Serveur Metro

Le serveur doit **toujours** tourner dans son propre terminal.
```powershell
cd C:\Users\Pierre\kiko\mobile_app
pnpm expo start --android
```

---

## 📱 4. Lancement par Appareil

Une fois le serveur Metro lancé, ouvre un **deuxième terminal** pour envoyer l'application vers tes appareils.

### Option A : Uniquement sur le Poco F5
```powershell
adb -s 4ab67f26 reverse tcp:8081 tcp:8081
# Puis appuie sur 'a' dans le terminal Metro
```

### Option B : Uniquement sur l'Émulateur
```powershell
adb -s emulator-5554 reverse tcp:8081 tcp:8081
# Puis appuie sur 'a' dans le terminal Metro (ou utilise le lien ci-dessous si ça ne réagit pas)
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "exp+kiko://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" com.pierretulle.juno2.dev
```

### Option C : Sur les DEUX en même temps (Mode Responsive)
```powershell
# Redirige les deux appareils
adb -s 4ab67f26 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# Puis appuie sur 'a' dans le terminal Metro. 
# L'app s'ouvrira sur les deux et se mettra à jour en simultané !
```

---

## ⚠️ Notes importantes
- **ID Poco F5** : `4ab67f26`
- **ID Émulateur** : `emulator-5554`
- Si l'émulateur affiche une erreur `NativeModule`, débranche le Poco, lance `pnpm expo run:android --no-bundler` pour l'émulateur, puis rebranche le Poco.

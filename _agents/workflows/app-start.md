---
description: Lancer l'application Expo sur Android via USB sans demande de confirmation
---

// turbo-all

1. Vérifier les connexions
```powershell
adb devices
```

2. Configurer le reverse proxy
```powershell
adb reverse tcp:8081 tcp:8081
```

3. Relancer l'application
```powershell
adb shell am force-stop com.pierretulle.juno2.dev; adb shell am start -a android.intent.action.VIEW -d "exp+kiko://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" com.pierretulle.juno2.dev
```

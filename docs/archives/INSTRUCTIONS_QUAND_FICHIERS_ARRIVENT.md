# 📦 Instructions de restauration des fichiers

**À suivre quand les fichiers seront dans E:\transfert\anciens_fichiers\**

---

## ✅ Fichiers déjà OK

- **`.env`** - Déjà vérifié et identique

---

## 📋 Quand les fichiers arrivent dans `anciens_fichiers/`

### 1. Vérifier ce qui a été récupéré

```bash
ls -la /e/transfert/anciens_fichiers/
```

### 2. Restaurer les fichiers selon leur type

#### 🔴 **KEYSTORE ANDROID** (.jks ou .keystore)
```bash
# Copier vers android/app/
cp /e/transfert/anciens_fichiers/*.jks android/app/
# OU
cp /e/transfert/anciens_fichiers/*.keystore android/app/
```

**IMPORTANT** : Note le nom et le chemin exact du keystore !

#### 🟡 **CREDENTIALS JSON**
```bash
# Copier à la racine du projet
cp /e/transfert/anciens_fichiers/credentials.json .
cp /e/transfert/anciens_fichiers/kiko-chrono-*.json .
cp /e/transfert/anciens_fichiers/tiktok-credentials.json .
cp /e/transfert/anciens_fichiers/twitter-credentials.json .
cp /e/transfert/anciens_fichiers/discord-webhook.json .
```

#### 🟢 **FIREBASE iOS** (si existe)
```bash
# Copier GoogleService-Info.plist vers ios/[app-name]/
# (Vérifier d'abord le nom de l'app iOS)
```

### 3. Vérifier les fichiers copiés

```bash
# Keystore
ls -la android/app/*.jks android/app/*.keystore

# Credentials
ls -la credentials.json kiko-chrono-*.json tiktok-credentials.json

# Firebase
ls -la android/app/google-services.json
```

### 4. Mettre à jour .gitignore si besoin

Les fichiers suivants doivent être dans .gitignore (déjà fait) :
- `*.jks`
- `*.keystore`
- `credentials.json`
- `kiko-chrono-*.json`
- `tiktok-credentials.json`
- `twitter-credentials.json`
- `discord-webhook.json`

### 5. Builder l'app Android

Une fois le keystore restauré :

```bash
# Nettoyer les caches Gradle
cd android && ./gradlew clean && cd ..

# Rebuild
pnpm prebuild:android

# Lancer l'app
pnpm android
```

---

## 🔍 Si le keystore est manquant

Si aucun fichier .jks ou .keystore n'a été trouvé :

### Option 1 : Vérifier EAS Credentials
```bash
eas credentials
```

### Option 2 : Utiliser EAS Build
```bash
eas build --platform android --profile development
```
EAS créera un nouveau keystore automatiquement.

⚠️ **ATTENTION** : Si tu crées un nouveau keystore, tu ne pourras plus mettre à jour l'app existante sur le Play Store. Tu devras publier sous un nouveau package name.

---

## 📞 Commandes rapides pour moi (Claude)

Quand tu me diras que les fichiers sont arrivés, je lancerai :

```bash
# Lister ce qui a été récupéré
ls -la /e/transfert/anciens_fichiers/

# Copier automatiquement
cp /e/transfert/anciens_fichiers/*.jks android/app/ 2>/dev/null
cp /e/transfert/anciens_fichiers/*.keystore android/app/ 2>/dev/null
cp /e/transfert/anciens_fichiers/credentials*.json . 2>/dev/null
cp /e/transfert/anciens_fichiers/kiko-chrono*.json . 2>/dev/null
cp /e/transfert/anciens_fichiers/*-credentials.json . 2>/dev/null

# Vérifier
ls -la android/app/*.{jks,keystore} *.json | grep -v node_modules
```

---

## ✅ Checklist finale

Après restauration, vérifie :
- [ ] Keystore présent dans `android/app/`
- [ ] Credentials JSON à la racine
- [ ] `pnpm android` fonctionne
- [ ] L'app se lance sur l'émulateur
- [ ] Reactotron se connecte

---

**Dis-moi simplement quand les fichiers seront dans `anciens_fichiers/` et je m'occupe du reste !**

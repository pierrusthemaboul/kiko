# 📦 Récupération des fichiers manquants depuis l'ancien ordinateur

Bonjour ! Je suis sur l'ancien ordinateur de Pierre et je dois identifier et copier les fichiers qui ne sont pas versionnés dans Git.

## 📍 Projet concerné

Nom du projet : **Kiko** (anciennement Timalaus)
Type : Application React Native / Expo
Localisation probable : Cherche un dossier nommé `kiko`, `timalaus`, `juno`, ou contenant un fichier `package.json` avec `"name": "timalaus"`

## 🔍 Fichiers à rechercher et copier

### 1. **Fichiers de configuration Firebase** (CRITIQUES)

Vérifie ces emplacements :
```
android/app/google-services.json
ios/[nom-app]/GoogleService-Info.plist
google-services.json (à la racine)
```

**Action** :
- Copie `google-services.json` (s'il existe) vers une clé USB dans un dossier `kiko-backup/firebase/`
- Note : google-services.json existe déjà sur le nouvel ordi, mais vérifie qu'il est identique

---

### 2. **Fichiers de credentials API** (SENSIBLES - NE PAS PARTAGER)

Cherche ces fichiers **à la racine du projet** :

```
credentials.json
kiko-chrono-*.json (ex: kiko-chrono-abc123.json)
tiktok-credentials.json
twitter-credentials.json
discord-webhook.json
```

**Action** :
- Copie TOUS ces fichiers vers `kiko-backup/credentials/`
- Ces fichiers sont SENSIBLES, ne les partage JAMAIS publiquement

---

### 3. **Fichiers .env** (SENSIBLES)

Cherche ces fichiers :
```
.env
.env.local
.env.production
.env.development
```

**Action** :
- Copie tous les fichiers .env* vers `kiko-backup/env/`
- Note : .env existe déjà sur le nouvel ordi, mais compare les clés

---

### 4. **Keystores Android** (CRITIQUES pour publier l'app)

Cherche ces fichiers dans `android/app/` ou à la racine :
```
*.jks
*.keystore
upload-keystore.jks
release.keystore
debug.keystore
```

**Action** :
- Copie tous les fichiers .jks et .keystore vers `kiko-backup/keystores/`
- **TRÈS IMPORTANT** : Sans ces fichiers, impossible de mettre à jour l'app sur Google Play

---

### 5. **Certificats iOS** (si l'app existe sur iOS)

Cherche ces fichiers :
```
*.p8
*.p12
*.mobileprovision
*.pem
ios/[nom-app]/GoogleService-Info.plist
```

**Action** :
- Copie tous ces fichiers vers `kiko-backup/ios-certs/`

---

### 6. **Autres fichiers potentiellement importants**

Cherche aussi :
```
fix_rls.ts (script de fix local)
*.orig (backups)
scripts/*.json (credentials dans le dossier scripts)
```

**Action** :
- Copie vers `kiko-backup/divers/`

---

## 🚀 Commandes à exécuter sur l'ancien ordinateur

### Étape 1 : Localiser le projet

```bash
# Chercher le projet par nom
find ~ -name "package.json" -exec grep -l "timalaus\|kiko\|juno" {} \; 2>/dev/null

# Ou chercher directement le dossier
find ~ -type d -name "kiko" -o -name "timalaus" -o -name "juno" 2>/dev/null
```

### Étape 2 : Se placer dans le projet

```bash
cd /chemin/vers/le/projet
```

### Étape 3 : Lister les fichiers ignorés par Git qui existent

```bash
# Voir tous les fichiers ignorés qui existent
git status --ignored

# Ou utiliser cette commande pour voir les fichiers sensibles
ls -la | grep -E "\.(jks|keystore|p8|p12|pem|json|env)"
```

### Étape 4 : Créer la structure de backup

```bash
mkdir -p kiko-backup/{firebase,credentials,env,keystores,ios-certs,divers}
```

### Étape 5 : Copier les fichiers

```bash
# Firebase
cp android/app/google-services.json kiko-backup/firebase/ 2>/dev/null
cp ios/*/GoogleService-Info.plist kiko-backup/firebase/ 2>/dev/null

# Credentials
cp credentials.json kiko-backup/credentials/ 2>/dev/null
cp kiko-chrono-*.json kiko-backup/credentials/ 2>/dev/null
cp tiktok-credentials.json kiko-backup/credentials/ 2>/dev/null
cp twitter-credentials.json kiko-backup/credentials/ 2>/dev/null
cp discord-webhook.json kiko-backup/credentials/ 2>/dev/null

# ENV files
cp .env* kiko-backup/env/ 2>/dev/null

# Keystores
cp android/app/*.jks kiko-backup/keystores/ 2>/dev/null
cp android/app/*.keystore kiko-backup/keystores/ 2>/dev/null
cp *.jks kiko-backup/keystores/ 2>/dev/null
cp *.keystore kiko-backup/keystores/ 2>/dev/null

# iOS certs
cp *.p8 kiko-backup/ios-certs/ 2>/dev/null
cp *.p12 kiko-backup/ios-certs/ 2>/dev/null
cp *.mobileprovision kiko-backup/ios-certs/ 2>/dev/null
cp *.pem kiko-backup/ios-certs/ 2>/dev/null

# Divers
cp fix_rls.ts kiko-backup/divers/ 2>/dev/null
```

### Étape 6 : Vérifier ce qui a été copié

```bash
find kiko-backup -type f -ls
```

### Étape 7 : Compresser pour transfert

```bash
# Créer une archive chiffrée (recommandé car contient des secrets)
tar -czf kiko-backup.tar.gz kiko-backup/

# Ou sans compression
zip -r kiko-backup.zip kiko-backup/
```

---

## 📋 Checklist de vérification

Après avoir exécuté les commandes, vérifie que tu as récupéré au minimum :

- [ ] `.env` (ou `.env.local`, `.env.production`)
- [ ] `google-services.json` (Firebase Android)
- [ ] Au moins 1 fichier `.jks` ou `.keystore` (keystore Android)
- [ ] `credentials.json` (si existe)
- [ ] `kiko-chrono-*.json` (Google Play API - si existe)

---

## ⚠️ IMPORTANT - Sécurité

Ces fichiers contiennent des **secrets critiques** :
- Clés API
- Tokens d'authentification
- Certificats de signature d'application

**NE JAMAIS** :
- Les envoyer par email non chiffré
- Les uploader sur GitHub/GitLab
- Les partager publiquement
- Les stocker dans le cloud non chiffré

**RECOMMANDÉ** :
- Utiliser une clé USB physique pour le transfert
- Ou un service de transfert chiffré (WeTransfer, Firefox Send)
- Supprimer les fichiers du cloud après transfert

---

## 📤 Fichier de résultat attendu

Génère un fichier texte `inventaire.txt` avec la liste de tous les fichiers trouvés :

```bash
find kiko-backup -type f > inventaire.txt
```

Envoie ce fichier `inventaire.txt` à Pierre pour qu'il sache ce qui a été récupéré.

---

## ❓ Si un fichier est manquant

Si un fichier critique est manquant (ex: keystore Android), note-le dans un fichier `fichiers-manquants.txt` :

```bash
echo "FICHIERS MANQUANTS :" > fichiers-manquants.txt
echo "- upload-keystore.jks : NON TROUVÉ" >> fichiers-manquants.txt
```

Pierre devra peut-être régénérer ces fichiers ou les récupérer depuis EAS (Expo Application Services).

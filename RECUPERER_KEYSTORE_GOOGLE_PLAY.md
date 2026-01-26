# 🔑 Récupérer le keystore depuis Google Play Console

## Méthode 1 : Via Google Play Console (RECOMMANDÉ)

### Étape 1 : Se connecter

1. Va sur https://play.google.com/console
2. Connecte-toi avec ton compte Google développeur
3. Sélectionne ton app **"Kiko"** (ou nom affiché)

### Étape 2 : Accéder à la signature de l'application

1. Dans le menu de gauche, clique sur **"Configuration"**
2. Puis **"Signature de l'application"** (ou "App signing")

### Étape 3 : Vérifier l'état

Tu vas voir un des deux cas :

#### ✅ Cas A : Google Play App Signing est activé

Tu verras :
- **App signing key certificate** (géré par Google)
- **Upload key certificate** (c'est celui qui nous intéresse !)

**Actions** :
1. Clique sur l'onglet **"Upload key certificate"**
2. Tu verras les infos du certificat (SHA-256, etc.)
3. **IMPORTANT** : Il n'y a PAS de bouton "Download" direct pour le keystore

**Solutions** :

**Option A** : Demander un nouveau upload key
- Clique sur **"Request upload key reset"**
- Google générera un nouveau keystore
- Tu pourras utiliser ce nouveau keystore pour les futures releases

**Option B** : Vérifier dans tes backups Expo
```bash
eas credentials --platform android
```
Le keystore est peut-être stocké là.

#### ❌ Cas B : Google Play App Signing n'est PAS activé

Tu verras un message disant que la signature est gérée localement.

**Cela signifie** :
- Le keystore est UNIQUEMENT sur ton ordi
- Google n'a pas de copie
- **Tu DOIS retrouver le fichier original**

---

## Méthode 2 : Via EAS Credentials (PLUS RAPIDE)

Si tu utilises Expo, le keystore est probablement stocké dans EAS :

```bash
# Installer EAS CLI
pnpm add -g eas-cli

# Se connecter
eas login

# Voir les credentials
eas credentials --platform android

# Options affichées :
# - View credentials in Expo website
# - Download credentials
# - Manage credentials (add/remove)
```

Si le keystore existe dans EAS :
1. Sélectionne **"Download credentials"**
2. Le fichier sera téléchargé localement
3. Copie-le dans `android/app/upload-keystore.jks`

---

## Méthode 3 : Vérifier les anciennes machines de build

Si tu utilisais un service de build cloud (Bitrise, CircleCI, GitHub Actions) :

1. Va dans les paramètres du service
2. Cherche dans **"Secrets"** ou **"Environment variables"**
3. Le keystore était peut-être uploadé en base64

Exemple pour GitHub Actions :
- Va dans ton repo → Settings → Secrets
- Cherche une variable nommée `KEYSTORE_FILE` ou `UPLOAD_KEYSTORE`

---

## 🚀 COMMANDES À EXÉCUTER MAINTENANT

### Essai 1 : EAS Credentials (30 secondes)

```bash
pnpm add -g eas-cli
eas login
eas credentials --platform android
```

Si ça affiche des credentials → **TU ES SAUVÉ !**

### Essai 2 : Vérifier le package name

Ton app actuelle s'appelle `com.pierretulle.juno2` (d'après le terminal).

Sur Google Play Console, vérifie que c'est bien ce package name.

---

## 📝 Informations utiles

**Package name actuel** : `com.pierretulle.juno2`

**Fichiers trouvés** :
- `debug.keystore` ✓ (pour développement uniquement)
- `upload-keystore.jks` ✗ (MANQUANT - nécessaire pour production)

**Credentials trouvés** :
- kiko-chrono-c28384984e64.json
- kiko-chrono-d02fc8cffcf6.json
- kiko-chrono-e34241a84e41.json
- kiko-chrono-firebase-adminsdk-fbsvc-1d73e8e206.json

(Ces fichiers sont pour les APIs Google, pas pour le keystore Android)

---

## ⚡ ACTION IMMÉDIATE

**Lance cette commande MAINTENANT** :

```bash
pnpm add -g eas-cli && eas login
```

Puis :

```bash
eas credentials --platform android
```

**Dis-moi ce que ça affiche !**

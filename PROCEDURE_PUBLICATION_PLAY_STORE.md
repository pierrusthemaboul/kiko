# 📱 Procédure de Publication sur Google Play Store

## Vue d'ensemble

Ce document décrit la procédure complète et automatisée pour publier une nouvelle version de l'application Timalaus sur le Google Play Store.

---

## ✅ Prérequis

Avant de commencer, assurez-vous que :

1. **EAS CLI est installé et configuré**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Le projet a le support 16 KB page size** (obligatoire pour Android 15+)
   - Configuration présente dans `app.config.js` :
     ```javascript
     ndkVersion: "27.1.12297006"
     packagingOptions: {
       jniLibs: {
         useLegacyPackaging: false
       }
     }
     ```

3. **Service Account configuré**
   - Fichier : `kiko-chrono-d02fc8cffcf6.json`
   - Configuré dans `eas.json` :
     ```json
     "submit": {
       "production": {
         "android": {
           "track": "production",
           "releaseStatus": "completed",
           "serviceAccountKeyPath": "./kiko-chrono-d02fc8cffcf6.json"
         }
       }
     }
     ```

---

## 🚀 Procédure Complète

### Étape 1 : Incrémenter les versions

#### 1.1 Modifier `app.config.js`

Fichier : `/home/pierre/kiko/app.config.js`

```javascript
version: "1.X.X",  // Incrémenter (ex: 1.6.0 → 1.6.1)
```

#### 1.2 Modifier `android/app/build.gradle`

Fichier : `/home/pierre/kiko/android/app/build.gradle`

Ligne ~94-95 :
```gradle
versionCode 10XXX  // Incrémenter de 1 (ex: 10115 → 10116)
versionName "1.X.X"  // Doit correspondre à app.config.js
```

**Important** : Les deux fichiers doivent avoir des versions cohérentes !

---

### Étape 2 : Construire l'AAB

```bash
cd ~/kiko
eas build --profile production --platform android
```

**Durée estimée** : 5-10 minutes

**Résultat attendu** :
```
✔ Build finished
🤖 Android app:
https://expo.dev/artifacts/eas/XXXXXXXXXXXXX.aab
```

---

### Étape 3 : Soumettre au Play Store

```bash
cd ~/kiko
eas submit --platform android --profile production --latest
```

**Durée estimée** : 1-2 minutes

**Résultat attendu** :
```
✔ Submitted your app to Google Play Store!
All done!
```

---

### Étape 4 : Vérification sur Google Play Console

1. Accéder à [Google Play Console](https://play.google.com/console)
2. Sélectionner l'application **Timalaus**
3. Aller dans **Production** → **Versions**
4. Vérifier que la nouvelle version apparaît avec :
   - ✅ Statut : "Disponible sur Google Play"
   - ✅ Aucune erreur affichée
   - ✅ Bon numéro de version

---

## 📋 Checklist de Publication

- [ ] Versions incrémentées dans `app.config.js`
- [ ] Versions incrémentées dans `android/app/build.gradle`
- [ ] Les deux versions correspondent exactement
- [ ] Build AAB réussi (commande `eas build`)
- [ ] Soumission réussie (commande `eas submit`)
- [ ] Version visible sur Google Play Console
- [ ] Aucune erreur affichée (notamment 16 KB page size)
- [ ] Statut "Disponible sur Google Play"

---

## 🔧 Configuration Critique pour Android 15+

### Support 16 KB Page Size (OBLIGATOIRE)

Depuis novembre 2025, Google Play exige le support des pages mémoire de 16 KB pour Android 15+.

**Configuration requise dans `app.config.js`** :

```javascript
plugins: [
  [
    "expo-build-properties",
    {
      android: {
        kotlinVersion: "1.9.25",
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        buildToolsVersion: "35.0.0",
        gradleVersion: "8.10.2",
        ndkVersion: "27.1.12297006",           // ← CRITIQUE
        packagingOptions: {                     // ← CRITIQUE
          jniLibs: {
            useLegacyPackaging: false          // ← CRITIQUE
          }
        }
      }
    }
  ]
]
```

**Sans cette configuration**, vous obtiendrez l'erreur :
> "Votre appli ne prend pas en charge les tailles de page de mémoire de 16 ko"

---

## 🎯 Versions du Projet

### Historique des versions

| Version | Version Code | Date | Notes |
|---------|--------------|------|-------|
| 1.6.0   | 10115        | 03/01/2026 | Modifications Firebase + fix 16KB |
| 1.5.9   | 10114        | 03/01/2026 | Fix support 16 KB page size |
| 1.5.8   | 10113        | 02/01/2026 | Tentative initiale |

### Règles de versioning

- **Version Name** (`versionName`) : Format `X.Y.Z` (SemVer)
  - `X` : Major (changements majeurs)
  - `Y` : Minor (nouvelles fonctionnalités)
  - `Z` : Patch (corrections de bugs)

- **Version Code** (`versionCode`) : Entier incrémentiel
  - Doit **toujours augmenter**
  - Ne peut jamais être réutilisé
  - Format utilisé : `101XX` (ex: 10115, 10116, 10117...)

---

## ⚠️ Erreurs Courantes et Solutions

### Erreur : "You've already submitted this version"

**Cause** : Le `versionCode` n'a pas été incrémenté ou est identique à une version déjà soumise.

**Solution** :
1. Incrémenter `versionCode` dans `android/app/build.gradle`
2. Rebuilder l'AAB avec `eas build`
3. Resoumettre avec `eas submit`

---

### Erreur : "Votre appli ne prend pas en charge les tailles de page de mémoire de 16 ko"

**Cause** : Configuration NDK manquante ou incorrecte.

**Solution** :
Vérifier que `app.config.js` contient :
```javascript
ndkVersion: "27.1.12297006",
packagingOptions: {
  jniLibs: {
    useLegacyPackaging: false
  }
}
```

**Ressources** :
- [Fix React Native Expo 16KB Page Size Issue](https://zeeshan.p2pclouds.net/blogs/fix-for-react-native-expo-16kb-page-size-issue/)
- [GitHub Issue #53649](https://github.com/facebook/react-native/issues/53649)

---

### Erreur : Versions incohérentes entre builds

**Cause** : `app.config.js` modifié mais pas `android/app/build.gradle`.

**Solution** :
Les deux fichiers doivent être synchronisés :
- `app.config.js` → `version: "1.X.X"`
- `android/app/build.gradle` → `versionName "1.X.X"` ET `versionCode 10XXX`

**Note** : Depuis que le projet a un dossier `android/`, EAS utilise les versions du fichier Gradle, pas du `app.config.js`.

---

## 🔐 Authentification et Credentials

### Service Account Google Cloud

**Email** : `play-console-api@kiko-chrono.iam.gserviceaccount.com`

**Fichier de clé** : `./kiko-chrono-d02fc8cffcf6.json`

**Permissions requises sur Google Play Console** :
- ✅ Accès aux versions (Release)
- ✅ Modifier et supprimer les versions

### Configuration EAS

Le Service Account est configuré dans `eas.json` :

```json
"submit": {
  "production": {
    "android": {
      "track": "production",
      "releaseStatus": "completed",
      "serviceAccountKeyPath": "./kiko-chrono-d02fc8cffcf6.json"
    }
  }
}
```

---

## 📊 Commandes Utiles

### Lister les builds récents
```bash
eas build:list --platform android --limit 5
```

### Voir les détails d'un build
```bash
eas build:view <BUILD_ID>
```

### Lister les soumissions récentes
```bash
eas submit:list --platform android --limit 5
```

### Voir l'état du projet
```bash
eas project:info
```

### Mettre à jour EAS CLI
```bash
npm install -g eas-cli
```

---

## 🎯 Instruction pour Claude

Quand l'utilisateur demande de publier une nouvelle version sur le Play Store :

1. **Lire ce fichier** pour se référer à la procédure
2. **Incrémenter les versions** dans les deux fichiers requis
3. **Construire l'AAB** avec `eas build`
4. **Soumettre automatiquement** avec `eas submit`
5. **Confirmer** la publication réussie

**Commande type** :
> "Publie une nouvelle version sur le Play Store en suivant la procédure dans PROCEDURE_PUBLICATION_PLAY_STORE.md"

---

## 📝 Notes Importantes

1. **Toujours incrémenter les versions** avant de build
2. **Les deux fichiers** (`app.config.js` et `build.gradle`) doivent être synchronisés
3. **Le versionCode** ne peut jamais diminuer ou être réutilisé
4. **Le support 16 KB page size** est obligatoire depuis 2025
5. **La soumission est automatique** grâce au Service Account configuré
6. **Temps total** : ~10-15 minutes de la modification au Play Store

---

## 🔗 Liens Utiles

- [Google Play Console](https://play.google.com/console)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Google Cloud Console - Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
- [Android 16KB Page Size Requirements](https://github.com/facebook/react-native/issues/53649)

---

**Dernière mise à jour** : 03/01/2026
**Version du document** : 1.0
**Mainteneur** : Pierre

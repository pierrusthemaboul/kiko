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

### 3. Service Account et Secrets GitHub
-   **Fichier de clé principal** : `kiko-chrono-e34241a84e41.json` (configuré dans `eas.json`)
-   **Secrets GitHub** (OBLIGATOIRE pour la CI/CD) :
    -   `EXPO_TOKEN` : Jeton d'accès Expo.
    -   `PLAY_STORE_CONFIG_JSON` : Contenu du fichier `.json` de la clé.

#### 4. Build d'un APK (Pour test direct)
Si vous voulez simplement un fichier APK pour l'installer manuellement :
- Utilisez **l'Option C** expliquée ci-dessous.

---

## 🚀 Procédure de Publication & Build (3 Options)

### 🥇 Option A : Via GitHub Actions (**PRIORITÉ ABSOLUE**)

C'est la méthode **obligatoire** par défaut. Elle évite de saturer l'ordinateur local et contourne les limites de quota EAS Cloud.

#### 1. Préparation (Pour l'IA)
- #### 3.1 Mettre à jour les versions (ALIGNEMENT CRITIQUE)
Il est impératif que les versions soient synchronisées dans **4 fichiers** :

1.  **`app.config.js`** : `version: "1.X.X"` ET `runtimeVersion: "1.X.X"`
2.  **`android/app/build.gradle`** : `versionName "1.X.X"` ET `versionCode 10XXX`
3.  **`package.json`** : `"version": "1.X.X"`
4.  **`hooks/useGameLogicA.ts`** & **`hooks/game/useEventSelector.ts`** : Fallback version dans le code (rechercher "1.X.X").

- [ ] Incrémenter `version` (ex: "1.6.7" → "1.6.8")
- [ ] Mettre à jour `runtimeVersion` pour correspondre à la version (ex: "1.6.8"). **Indispensable pour la compatibilité OTA.**
- [ ] Incrémenter `versionCode` (ex: 10124 → 10125). **Obligatoire pour Google Play.**
- [ ] Vérifier que `android.package` correspond au bundle ID : `com.pierretulle.juno2`
L'IA doit utiliser la commande suivante pour lancer le build ET la soumission :
```bash
gh workflow run build-android.yml
```
*(Cette commande déclenche le workflow qui gère tout de A à Z).*

#### 3. Suivi du build
L'IA doit surveiller l'avancement avec :
```bash
gh run watch
```

---
 
 ### 🥉 Option C : Build APK (Test Rapide)
 
 Pour générer un APK sans impact sur le Play Store :
 - **Via Terminal** :
   ```bash
   gh workflow run build-apk.yml
   ```
 - **Via Navigateur** : Allez dans Actions → **Build APK** → **Run workflow**.
 - **Récupération** : Une fois terminé, téléchargez l'APK dans les "Artifacts" du build sur GitHub.
 
 ---
 
 ### 🥈 Option B : Via EAS (Manuel / Local)

À utiliser en cas de problème avec GitHub Actions ou pour un test spécifique.

#### 1. Construire l'AAB localement (Optimisé pour votre RAM)
```bash
./android/gradlew --stop
EAS_SKIP_AUTO_FINGERPRINT=1 eas build --platform android --profile production --local
```

#### 2. Soumettre au Play Store
```bash
eas submit --platform android --profile production --path ./le-fichier-genere.aab
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
| 1.6.4   | 10121        | 04/01/2026 | Mise à jour demandée par l'utilisateur |
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

- **Runtime Version** (`runtimeVersion`) :
  - Doit correspondre au `versionName` pour chaque nouvelle version du Store.
  - C'est ce qui garantit que les futures mises à jour "Over The Air" (OTA) ne mixeront pas des fichiers incompatibles.

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

**Fichier de clé utilisé** : `./kiko-chrono-e34241a84e41.json`

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

## 🎯 Instructions Spécifiques pour l'IA (Antigravity / Claude)

Quand l'utilisateur demande : "Publie une nouvelle version sur le Play Store" :

1.  **Priorité 1 (GitHub CI)** : Utiliser TOUJOURS **l'Option A** (GitHub Actions).
    - Incrémenter les versions dans les 4 emplacements cités en section 3.1.
    - S'assurer que le `versionCode` est strictement supérieur au précédent.
    - S'assurer que le `runtimeVersion` est aligné.
    - `git push`.
    - `gh workflow run build-android.yml`.
    - `gh run watch`.
2.  **Fallback (Local)** : N'utiliser l'Option B (EAS local) que si GitHub Actions est indisponible.
3.  **Vérification** : Une fois que `gh run watch` confirme le succès, informer l'utilisateur.

**Commande type de l'utilisateur** :
> "Publie une nouvelle version sur le Play Store en suivant la procédure prioritaire."

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

**Dernière mise à jour** : 06/01/2026 (Intégration GitHub Actions)
**Version du document** : 1.0
**Mainteneur** : Pierre

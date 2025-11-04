# Guide de Migration vers Expo SDK 53

> **Version actuelle du projet**: SDK 52
> **Version cible**: SDK 53
> **Date de création**: 2025-11-04

---

## 📋 Table des matières

1. [Prérequis système](#prérequis-système)
2. [Breaking changes critiques](#breaking-changes-critiques)
3. [Packages dépréciés et remplacements](#packages-dépréciés-et-remplacements)
4. [Vérifications de compatibilité](#vérifications-de-compatibilité)
5. [Plan de migration étape par étape](#plan-de-migration-étape-par-étape)
6. [Points d'attention spécifiques au projet](#points-dattention-spécifiques-au-projet)
7. [Tests et validation](#tests-et-validation)
8. [Rollback si nécessaire](#rollback-si-nécessaire)

---

## ⚠️ Prérequis système

### Versions requises

| Outil | Version actuelle | Version requise SDK 53 | Action |
|-------|------------------|------------------------|--------|
| **Node.js** | À vérifier | ≥ 20.x (Node 18 EOL le 30/04/2025) | ✅ OBLIGATOIRE |
| **Xcode** | À vérifier | 16.2+ (minimum 16.0) | ✅ OBLIGATOIRE (iOS) |
| **EAS CLI** | À vérifier | Dernière version | Mettre à jour avec `npm i -g eas-cli` |
| **TypeScript** | 5.3.3 | ~5.8.3 | Mise à jour recommandée |

### Commandes de vérification

```bash
node --version  # Doit être ≥ 20.x
xcodebuild -version  # Doit être ≥ 16.0
eas --version
```

---

## 🔥 Breaking changes critiques

### 1. **New Architecture activée par défaut**

**Impact**: CRITIQUE
**État actuel**: `"newArchEnabled": false` dans `app.json`

**Actions requises**:
- ✅ Le projet a explicitement désactivé la New Architecture
- ⚠️ **Décision à prendre**: Garder `false` pour SDK 53 OU migrer vers New Architecture
- 🚨 **Important**: La New Architecture sera **OBLIGATOIRE en SDK 54**
- Si maintien à `false`: Tester que l'opt-out fonctionne correctement
- Si migration: Vérifier la compatibilité de TOUTES les dépendances avec New Architecture

**Documentation**: [Désactiver la New Architecture](https://docs.expo.dev/guides/new-architecture/#disable-the-new-architecture-in-an-existing-project)

### 2. **React 19 et React Native 0.79**

**Impact**: CRITIQUE
**État actuel**: React 18.3.1, React Native 0.76.9

**Breaking changes de React 19**:
- Changements dans les APIs de contexte
- Nouvelles règles de rendu
- Modifications des hooks

**Actions requises**:
- Lire intégralement le [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- Tester tous les composants utilisant le Context API
- Vérifier les hooks personnalisés
- Attention aux rendus conditionnels

### 3. **Metro: package.json exports activés par défaut**

**Impact**: CRITIQUE
**Problème connu**: Dual package hazard (versions ESM et CommonJS chargées indépendamment)

**Packages à risque identifiés dans le projet**:
- ❌ **Firebase JS SDK** (problème confirmé en SDK 53)
- ⚠️ `@supabase/supabase-js` (problèmes rapportés)
- Tous les packages non mis à jour pour supporter les exports

**Actions requises**:
1. Vérifier si des erreurs de résolution de modules surviennent après upgrade
2. Option A: Corriger via overrides/resolutions dans `package.json`
3. Option B: Désactiver temporairement (non recommandé)
4. Option C: Migrer vers des alternatives compatibles

### 4. **Edge-to-Edge activé par défaut (Android)**

**Impact**: MOYEN
**Plateforme**: Android uniquement

**Actions requises**:
- Tester l'affichage sur tous les écrans Android
- Vérifier les zones de safe area
- Ajuster les layouts si nécessaire
- Tester sur différentes tailles d'écrans Android

### 5. **AppDelegate migré de Objective-C vers Swift**

**Impact**: MOYEN à ÉLEVÉ (si config plugins personnalisés)
**Plateforme**: iOS uniquement

**Actions requises**:
- Vérifier si des config plugins modifient `AppDelegate`
- Packages concernés potentiels:
  - `@react-native-firebase/app` (plugin présent)
  - `react-native-google-mobile-ads` (plugin présent)
  - `expo-build-properties` (plugin présent)
- Ces plugins doivent être à jour pour SDK 53

### 6. **Android linking scheme**

**Impact**: FAIBLE à MOYEN
**Changement**: Le package name Android n'est plus automatiquement ajouté comme linking scheme

**Actions requises**:
- Vérifier les deep links Android
- Tester les redirections d'authentification (expo-auth-session)
- Scheme actuel dans `app.json`: `"scheme": "juno2"`

### 7. **Suppressions**

**Impact**: FAIBLE (si non utilisé)

**Fonctionnalités supprimées**:
- ❌ Polyfill `setImmediate` retiré du runtime
- ❌ React DevTools retiré d'Expo CLI (consolidé dans React Native DevTools)

**Actions requises**:
- Rechercher `setImmediate` dans le code → Remplacer par `setTimeout` si trouvé
- Utiliser React Native DevTools au lieu de React DevTools

---

## 📦 Packages dépréciés et remplacements

### Migrations OBLIGATOIRES

#### 1. expo-av → expo-audio + expo-video

**État actuel**:
```json
"expo-av": "14.0.6",
"expo-audio": "~0.3.5"
```

**Situation**:
- ✅ `expo-audio` déjà installé (version 0.3.5)
- ⚠️ `expo-av` encore présent dans les dépendances
- 🚨 `expo-av` ne recevra AUCUNE mise à jour pour SDK 54+

**Actions requises**:
1. ✅ **OBLIGATOIRE**: Compléter la migration vers `expo-audio`
2. Vérifier le fichier [AUDIO_MIGRATION_GUIDE.md](./AUDIO_MIGRATION_GUIDE.md)
3. Rechercher toutes les utilisations de `expo-av` dans le code:
   ```bash
   grep -r "expo-av" --include="*.ts" --include="*.tsx" --include="*.js" .
   ```
4. Remplacer les imports:
   ```typescript
   // Ancien
   import { Audio } from 'expo-av';

   // Nouveau
   import { useAudioPlayer } from 'expo-audio';
   ```
5. Adapter les APIs (différences importantes):
   - Pas de reset automatique de la position de lecture
   - Utiliser `seekTo(0)` pour rejouer depuis le début
   - Nouvelle API de hooks plus moderne
6. Supprimer `expo-av` du `package.json` après migration complète

**Fichiers à vérifier en priorité**:
- `hooks/game/usePrecisionAudio.ts`
- `hooks/useAudio.ts`
- Tous les fichiers modifiés selon git status

#### 2. expo-background-fetch → expo-background-task

**État actuel**: Non utilisé dans le projet
**Action**: Aucune

---

## 🔍 Vérifications de compatibilité

### Packages critiques à vérifier

#### Firebase

**Packages actuels**:
```json
"@react-native-firebase/analytics": "^23.5.0",
"@react-native-firebase/app": "^23.5.0"
```

**Statut**:
- ⚠️ **PROBLÈME CONNU**: Firebase JS SDK incompatible avec Metro exports en SDK 53
- ✅ **SOLUTION**: Le projet utilise déjà `@react-native-firebase` (la bonne approche)
- Versions compatibles SDK 53: `^22.1.0` minimum

**Actions requises**:
1. Vérifier si versions 23.5.0 sont compatibles SDK 53 (probablement oui)
2. Tester Firebase Analytics après upgrade
3. Vérifier que le plugin `@react-native-firebase/app` est compatible Swift AppDelegate

#### Supabase

**Package actuel**:
```json
"@supabase/supabase-js": "^2.50.0"
```

**Statut**: ⚠️ Problèmes rapportés avec Metro exports

**Actions requises**:
1. Tester après upgrade
2. Si erreurs de module: Ajouter des overrides dans `package.json`
3. Vérifier les mises à jour de `@supabase/supabase-js`

#### Autres packages critiques

| Package | Version actuelle | Vérification nécessaire |
|---------|------------------|-------------------------|
| `expo-router` | ~4.0.21 | ✅ Tester navigation après upgrade |
| `react-native-reanimated` | ~3.16.1 | ✅ Vérifier compatibilité New Architecture |
| `react-native-gesture-handler` | ~2.20.2 | ✅ Tester gestures |
| `react-native-google-mobile-ads` | ^14.11.0 | ✅ Vérifier config plugin Swift |
| `@expo/config-plugins` | ^54.0.2 | ⚠️ Déjà en version 54! Vérifier pourquoi |

#### Overrides actuels à réviser

**Dans package.json**:
```json
"overrides": {
  "expo-ads-admob": {
    "@expo/config-plugins": "9.0.14"
  }
}
```

**Actions requises**:
- Vérifier si `expo-ads-admob` est encore utilisé (semble déprécié)
- Peut-être supprimer cet override
- Ajouter override pour React 19 si problèmes de versions multiples:
  ```json
  "overrides": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  }
  ```

---

## 🚀 Plan de migration étape par étape

### Phase 0: Préparation (AVANT toute modification)

#### 0.1 Backup et branching

```bash
# Créer une branche dédiée
git checkout -b migration/sdk-53

# Sauvegarder l'état actuel
git add .
git commit -m "chore: save state before SDK 53 migration"

# Tag de rollback facile
git tag pre-sdk53-migration
```

#### 0.2 Documentation de l'état actuel

```bash
# Sauvegarder les versions actuelles
pnpm list --depth=0 > pre-migration-packages.txt
node --version > pre-migration-env.txt
npm --version >> pre-migration-env.txt
```

#### 0.3 Tests avant migration

```bash
# S'assurer que tout fonctionne AVANT migration
npm run android  # Tester build Android
# Tester l'app manuellement
# Noter tout bug existant
```

### Phase 1: Mise à jour de l'environnement

#### 1.1 Node.js

```bash
# Vérifier version Node
node --version

# Si < 20, installer Node 20+
# macOS/Linux avec nvm:
nvm install 20
nvm use 20

# Ou installer depuis nodejs.org
```

#### 1.2 EAS CLI

```bash
npm install -g eas-cli@latest
eas --version
```

#### 1.3 Nettoyage

```bash
# Nettoyer les caches
rm -rf node_modules
rm -rf android/.gradle
rm -rf android/build
rm -rf ios/build
pnpm store prune
```

### Phase 2: Migration des packages

#### 2.1 Mise à jour vers SDK 53

```bash
# Installer Expo SDK 53
pnpm add expo@^53.0.0

# Mettre à jour toutes les dépendances
npx expo install --fix

# Vérifier les problèmes
npx expo-doctor@latest
```

#### 2.2 Résoudre les conflits

**Si `expo-doctor` signale des problèmes**:
- Lire attentivement chaque warning
- Installer les versions suggérées
- Réexécuter `npx expo install --fix`

**Exemple de sortie attendue**:
```
✔ Check Expo config
✔ Check package.json
✔ Check dependencies
✖ Check for common problems

  The following packages should be updated:
  - expo-router: 4.0.21 → 5.x.x
  ...
```

#### 2.3 Mise à jour manuelle si nécessaire

Si `expo install --fix` ne résout pas tout:

```bash
# React Native Firebase (si nécessaire)
pnpm add @react-native-firebase/app@^22.1.0
pnpm add @react-native-firebase/analytics@^22.1.0

# TypeScript
pnpm add -D typescript@~5.8.3
```

### Phase 3: Configuration

#### 3.1 Mettre à jour app.json

**Vérifier/Ajouter**:

```json
{
  "expo": {
    "newArchEnabled": false,  // OU true si vous migrez
    // ... reste de la config
  }
}
```

#### 3.2 Mettre à jour package.json

**Ajouter des overrides si nécessaire**:

```json
{
  "overrides": {
    "react": "19.0.0",  // Version exacte de SDK 53
    "react-dom": "19.0.0"
  }
}
```

#### 3.3 Vérifier les permissions Android

Dans `app.json`, permissions actuelles:
```json
"permissions": [
  "INTERNET",
  "VIBRATE",
  "MODIFY_AUDIO_SETTINGS",
  "READ_EXTERNAL_STORAGE",
  "RECORD_AUDIO",
  "SYSTEM_ALERT_WINDOW",
  "WRITE_EXTERNAL_STORAGE"
]
```

**Actions**:
- Vérifier que ces permissions sont toujours nécessaires
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` dépréciées Android 13+

### Phase 4: Projets natifs

#### 4.1 Approche Continuous Native Generation (RECOMMANDÉ)

```bash
# Supprimer les dossiers natifs
rm -rf android
rm -rf ios

# Regénérer avec SDK 53
npx expo prebuild --clean
```

#### 4.2 Approche manuelle (si modifications natives)

```bash
# iOS seulement
npx pod-install

# Consulter l'assistant de migration
# https://docs.expo.dev/bare/upgrade/
```

### Phase 5: Migrations de code

#### 5.1 Compléter migration expo-audio

**Suivre le guide**: [AUDIO_MIGRATION_GUIDE.md](./AUDIO_MIGRATION_GUIDE.md)

**Checklist**:
- [ ] Remplacer tous les imports de `expo-av`
- [ ] Adapter les APIs dans `usePrecisionAudio.ts`
- [ ] Adapter les APIs dans `useAudio.ts`
- [ ] Tester la lecture audio
- [ ] Tester les effets sonores
- [ ] Vérifier les loops
- [ ] Supprimer `expo-av` du package.json

#### 5.2 Rechercher et remplacer setImmediate

```bash
# Chercher setImmediate
grep -r "setImmediate" --include="*.ts" --include="*.tsx" --include="*.js" .

# Remplacer par setTimeout(..., 0) si trouvé
```

#### 5.3 Vérifier les imports React Native internes

```bash
# Chercher les imports problématiques
grep -r "require.*react-native/" --include="*.ts" --include="*.tsx" --include="*.js" .

# Remplacer les imports nested paths si trouvés
```

### Phase 6: Builds et tests

#### 6.1 Build de développement

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

**Erreurs attendues**:
- Erreurs de compatibilité packages
- Erreurs de config plugins
- Erreurs de compilation native

**Pour chaque erreur**:
1. Lire le message complet
2. Chercher dans les issues GitHub du package
3. Vérifier les versions des dépendances
4. Mettre à jour si nécessaire

#### 6.2 Rebuild development builds

```bash
# Si vous utilisez expo-dev-client
npx expo install expo-dev-client
eas build --profile development --platform android
```

#### 6.3 Tests fonctionnels

**Checklist de tests**:
- [ ] Application démarre sans crash
- [ ] Navigation fonctionne
- [ ] Audio fonctionne (sons, musique)
- [ ] Firebase Analytics enregistre les événements
- [ ] Supabase fonctionne (si utilisé)
- [ ] Publicités s'affichent
- [ ] Deep links fonctionnent
- [ ] Permissions demandées correctement
- [ ] Edge-to-edge OK sur Android
- [ ] Safe areas OK sur iOS

---

## 🎯 Points d'attention spécifiques au projet

### 1. Audio (PRIORITÉ MAXIMALE)

**Contexte**:
- Migration expo-av → expo-audio déjà commencée (voir git status)
- Fichiers modifiés: `usePrecisionAudio.ts`, `useAudio.ts`
- Guide existant: `AUDIO_MIGRATION_GUIDE.md`

**Actions OBLIGATOIRES**:
1. Finir la migration audio AVANT de passer à SDK 53
2. Supprimer complètement `expo-av` des dépendances
3. Tester exhaustivement les sons du jeu

### 2. Firebase (PRIORITÉ HAUTE)

**Contexte**:
- Utilise déjà `@react-native-firebase` (bon choix)
- Plugin Firebase dans `app.json`
- `google-services.json` présent

**Actions**:
1. Vérifier versions compatibles SDK 53
2. Tester Analytics après upgrade
3. Vérifier que le plugin supporte Swift AppDelegate

### 3. Google Mobile Ads (PRIORITÉ HAUTE)

**Contexte**:
- Plugin configuré dans `app.json`
- IDs d'app présents

**Actions**:
1. Vérifier version compatible SDK 53
2. Tester affichage des publicités
3. Vérifier que le plugin supporte Swift AppDelegate

### 4. Kotlin Version (ATTENTION)

**Contexte**:
```json
"expo-build-properties": {
  "android": {
    "kotlinVersion": "1.9.25"
  }
}
```

**Actions**:
1. Vérifier si Kotlin 1.9.25 compatible avec SDK 53
2. Peut nécessiter upgrade vers 2.x
3. Vérifier script `scripts/fix-kotlin-version.js`

### 5. New Architecture (DÉCISION STRATÉGIQUE)

**État actuel**: `"newArchEnabled": false`

**Options**:

#### Option A: Rester sur Old Architecture (plus sûr à court terme)
- ✅ Migration plus simple
- ✅ Moins de risques de compatibilité
- ❌ Obligatoire en SDK 54 (dans ~4-6 mois)
- ❌ Deux migrations au lieu d'une

#### Option B: Activer New Architecture maintenant (recommandé)
- ✅ Une seule migration à faire
- ✅ Meilleures performances
- ✅ Prêt pour l'avenir
- ❌ Plus de travail maintenant
- ❌ Risques de compatibilité

**Recommandation**:
- Si délais courts: Option A puis migration New Arch plus tard
- Si temps disponible: Option B (tout faire maintenant)

**Si Option B choisie**:
1. Changer `"newArchEnabled": true`
2. Vérifier compatibilité de TOUTES les dépendances
3. Tester exhaustivement
4. Lire: https://docs.expo.dev/guides/new-architecture/

### 6. Permissions Android

**Permissions obsolètes à vérifier**:
- `READ_EXTERNAL_STORAGE` (déprécié Android 13+)
- `WRITE_EXTERNAL_STORAGE` (déprécié Android 13+)

**Actions**:
1. Vérifier si ces permissions sont vraiment utilisées
2. Migrer vers Scoped Storage si nécessaire
3. Mettre à jour les permissions pour Android 13+

---

## ✅ Tests et validation

### Checklist de validation complète

#### Fonctionnalités de base
- [ ] **Démarrage**: App démarre sans crash
- [ ] **Splash screen**: S'affiche correctement
- [ ] **Navigation**: Toutes les routes fonctionnent
- [ ] **État de l'app**: Persistance avec AsyncStorage

#### Audio
- [ ] **Sons d'effet**: Tous les sons du jeu
- [ ] **Musique de fond**: Si applicable
- [ ] **Volume**: Contrôles de volume
- [ ] **Loop**: Boucles audio fonctionnent
- [ ] **Playback**: Pause/Resume

#### Firebase
- [ ] **Analytics**: Événements enregistrés
- [ ] **Crashlytics**: Si utilisé
- [ ] **Remote Config**: Si utilisé

#### Supabase
- [ ] **Authentification**: Si applicable
- [ ] **Database**: Requêtes fonctionnent
- [ ] **Storage**: Si utilisé

#### Publicités
- [ ] **Chargement**: Ads se chargent
- [ ] **Affichage**: Ads s'affichent correctement
- [ ] **Interactions**: Clics fonctionnent

#### UI/UX
- [ ] **Safe areas**: iOS notch/island
- [ ] **Edge-to-edge**: Android (nouveau)
- [ ] **StatusBar**: Couleurs correctes
- [ ] **Orientations**: Portrait verrouillé OK
- [ ] **Gestures**: Tous les gestes
- [ ] **Animations**: Reanimated fonctionne

#### Natif
- [ ] **Permissions**: Demandées correctement
- [ ] **Deep links**: Scheme `juno2://`
- [ ] **Haptics**: Vibrations
- [ ] **Fonts**: Montserrat charge
- [ ] **Images**: Assets chargent

#### Build
- [ ] **Android Debug**: Build réussit
- [ ] **Android Release**: Build réussit
- [ ] **iOS Debug**: Build réussit (si Mac)
- [ ] **iOS Release**: Build réussit (si Mac)

### Tests de régression

**Scénarios utilisateur complets**:
1. Installer l'app
2. Premier lancement (onboarding si applicable)
3. Jouer une partie complète
4. Mettre l'app en arrière-plan et revenir
5. Tuer l'app et relancer
6. Désinstaller et réinstaller

### Tests de performance

- [ ] **Temps de démarrage**: Comparable à avant
- [ ] **Fluidité**: 60fps maintenu
- [ ] **Mémoire**: Pas de fuites
- [ ] **Taille APK**: Vérifier pas d'explosion de taille

---

## 🔄 Rollback si nécessaire

### Si la migration échoue

#### Rollback immédiat (avant push)

```bash
# Revenir au tag pré-migration
git reset --hard pre-sdk53-migration

# Réinstaller les dépendances
pnpm install

# Nettoyer
rm -rf node_modules
rm -rf android
rm -rf ios
pnpm install
npx expo prebuild
```

#### Rollback après push

```bash
# Créer une branche de fix
git checkout -b fix/rollback-sdk53

# Revert les commits de migration
git revert <commit-sha-migration>

# Push
git push origin fix/rollback-sdk53
```

### Problèmes connus et solutions

#### Problème: Erreurs Firebase Auth

**Symptômes**: Module `firebase/auth` non trouvé
**Solution**: Utiliser `@react-native-firebase` (déjà fait dans ce projet)

#### Problème: Multiples versions de React

**Symptômes**: Hooks errors, "Invalid hook call"
**Solution**: Ajouter overrides dans `package.json`:
```json
"overrides": {
  "react": "19.0.0",
  "react-dom": "19.0.0"
}
```

#### Problème: Metro exports errors

**Symptômes**: Cannot resolve module
**Solution temporaire**:
```javascript
// metro.config.js
module.exports = {
  resolver: {
    unstable_enablePackageExports: false,
  },
};
```

#### Problème: New Architecture incompatibility

**Symptômes**: Crash au démarrage, TurboModule errors
**Solution**: Désactiver New Architecture:
```json
{
  "expo": {
    "newArchEnabled": false
  }
}
```

---

## 📚 Ressources et documentation

### Documentation officielle
- [Expo SDK 53 Changelog](https://expo.dev/changelog/sdk-53)
- [Expo Upgrade Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [New Architecture Guide](https://docs.expo.dev/guides/new-architecture/)

### Guides spécifiques
- [expo-audio Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [React Native Firebase](https://rnfirebase.io/)
- [Native Project Upgrade Helper](https://docs.expo.dev/bare/upgrade/)

### Support
- [Expo Discord](https://chat.expo.dev/)
- [Expo Forums](https://forums.expo.dev/)
- [Stack Overflow tag: expo](https://stackoverflow.com/questions/tagged/expo)

---

## 📝 Checklist finale pour l'IA

Avant de démarrer la migration, l'IA en charge devra:

### Préparation
- [ ] Lire ce document en entier
- [ ] Vérifier les versions Node.js et Xcode
- [ ] Créer une branche `migration/sdk-53`
- [ ] Créer un tag `pre-sdk53-migration`
- [ ] Sauvegarder la liste des packages actuels
- [ ] Documenter tout bug existant

### Migration
- [ ] Suivre le plan étape par étape
- [ ] Ne pas sauter d'étapes
- [ ] Documenter chaque problème rencontré
- [ ] Tester après chaque étape majeure

### Validation
- [ ] Compléter TOUTE la checklist de tests
- [ ] Tester sur un appareil réel Android
- [ ] Vérifier les logs pour warnings
- [ ] Comparer les performances avec SDK 52

### Documentation
- [ ] Documenter les changements de code
- [ ] Noter les versions finales des packages
- [ ] Créer un commit clair et descriptif
- [ ] Mettre à jour ce guide si nécessaire

### Livraison
- [ ] Build APK de test fonctionnel
- [ ] Rapport de migration complet
- [ ] Liste des changements breaking dans le code
- [ ] Recommandations pour SDK 54

---

## ⚡ Résumé des actions PRIORITAIRES

### Actions AVANT de commencer

1. ✅ **Finir migration audio** (expo-av → expo-audio)
2. ✅ **Vérifier Node.js ≥ 20**
3. ✅ **Backup complet**
4. ✅ **Décider**: Activer New Architecture ou non

### Actions PENDANT la migration

1. ✅ **Suivre l'ordre des phases**
2. ✅ **Exécuter `npx expo install --fix`**
3. ✅ **Vérifier avec `npx expo-doctor`**
4. ✅ **Regénérer projets natifs**

### Actions APRÈS la migration

1. ✅ **Tests complets** (checklist complète)
2. ✅ **Build Android fonctionnel**
3. ✅ **Documentation des changements**
4. ✅ **Planifier migration New Architecture** (si pas fait)

---

**Bonne chance pour la migration! 🚀**

*Document créé le 2025-11-04 pour le projet Kiko/Juno2*

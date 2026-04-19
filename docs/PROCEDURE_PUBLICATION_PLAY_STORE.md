# 📱 Procédure de Publication sur Google Play Store (Automatisée)

## Vue d'ensemble

Ce document décrit la procédure de référence pour publier une nouvelle version de l'application **Timalaus** sur le Google Play Store. Grâce au pipeline GitHub Actions stabilisé, le build et la soumission sont désormais entièrement automatisés.

---

## ✅ Prérequis CI/CD

Le pipeline s'appuie sur deux piliers configurés dans les secrets GitHub :
1.  **`EXPO_TOKEN`** : Jeton d'accès pour l'authentification EAS.
2.  **`PLAY_STORE_CONFIG_JSON`** : Contenu JSON de la clé du Service Account Google Cloud. Ce secret est utilisé pour créer dynamiquement le fichier `mobile_app/kiko-chrono-e34241a84e41.json` indispensable à la soumission.

---

## 🥇 Phase 1 : Préparation (Check-list Critique)

Avant de lancer un build, il est impératif de synchroniser les versions dans les fichiers suivants pour garantir la cohérence du déploiement et de l'OTA.

### 📋 Synchronisation des 5 emplacements clés :
1.  **`mobile_app/app.config.js`** : Mettre à jour `version` (ex: "1.7.2") et `runtimeVersion` (alignée sur la version).
2.  **`mobile_app/package.json`** : Mettre à jour le champ `"version"`.
3.  **`package.json` (Racine)** : Mettre à jour la version globale du projet.
4.  **`mobile_app/hooks/game/useInitGame.ts`** : **CRITIQUE** - Incrémenter `EVENTS_CACHE_VERSION` (ex: 11 → 12) pour forcer le rafraîchissement des données chez les joueurs.
5.  **`mobile_app/app.config.js` (`versionCode`)** : Incrémenter manuellement le `versionCode` (ex: 10128 → 10129).

### ⚠️ Règles de Versioning :
*   **versionCode** : Doit être **strictement supérieur** à la version précédente sur le Store. Règle d'incrément automatique : +1 à chaque nouvelle soumission.
*   **runtimeVersion** : Indispensable pour la compatibilité Over-The-Air (OTA). Doit correspondre exactement au `versionName`.

---

## 🚀 Phase 2 : Déploiement Automatisé (La Voie Royale)

Le déploiement est piloté par GitHub Actions et s'exécute dans l'environnement monorepo via le dossier `mobile_app`.

### 🛠️ Fonctionnement du Pipeline :
1.  **Injection de la Clé** : Le workflow récupère `PLAY_STORE_CONFIG_JSON` et génère le fichier `mobile_app/kiko-chrono-e34241a84e41.json`.
2.  **Build Local** : Gradle compile l'AAB dans le runner GitHub (plus rapide et évite les quotas EAS Cloud).
3.  **Soumission Automatique** : EAS Submit envoie l'AAB directement sur la console Google Play.

### ⌨️ Commande de lancement :
Exécutez cette commande depuis la racine du projet pour déclencher la production :
```bash
gh workflow run build-android.yml --ref main
```

---

## 🏁 Phase 3 : Validation & Surveillance

Une fois le run lancé, il est crucial de suivre son avancement pour confirmer la publication.

1.  **Suivi du Run ID** : Récupérer le lien généré par la commande précédente.
2.  **Étape Critique** : Confirmer que l'étape **`🚀 Submit to Play Store`** se termine en **Success** (vert).
3.  **Vérification Google Play Console** : Allez dans "Production" → "Versions" pour voir la nouvelle version (1.7.X) apparaître en cours de traitement.

---

## 🔧 Configurations Techniques (Rappel Vital)

### Support 16 KB Page Size (Android 15+)
La configuration suivante dans `mobile_app/app.config.js` est obligatoire pour la conformité Google Play 2025 :
```javascript
ndkVersion: "27.1.12297006",
packagingOptions: {
  jniLibs: {
    useLegacyPackaging: false
  }
}
```

### Correction Kotlin (Automatisée)
Le workflow applique automatiquement deux scripts de correction post-prebuild :
*   `fix-manifest.js` (Namespace tools & Permissions)
*   `fix-kotlin-version.js` (Force Kotlin 1.9.25)

---

## 🎯 Historique des versions (Récentes)

| Version | Version Code | Date | Cache | Notes |
|---------|--------------|------|-------|-------|
| 1.7.2   | 10129        | 16/04/2026 | V12 | Release stabilisée (Fix submission path) |
| 1.7.1   | 10128        | 16/04/2026 | V11 | Tentative initiale via Action |

---

**Dernière mise à jour** : 16/04/2026 (Stabilisation pipeline automatisé)
**Version du document** : 2.0
**Mainteneur** : Pierre / Antigravity

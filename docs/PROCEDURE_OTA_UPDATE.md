# 🔄 Procédure de Mise à Jour OTA (Over-The-Air)

## Vue d'ensemble

Ce document décrit la procédure pour déployer des mises à jour OTA (Over-The-Air) de l'application **Timalaus** sans passer par les stores. Les OTA permettent de corriger des bugs, ajouter des fonctionnalités et mettre à jour les données rapidement.

---

## ✅ Prérequis

- Compte EAS configuré avec `EXPO_TOKEN`
- `runtimeVersion` synchronisé dans `app.config.js`
- Branch `production` configurée dans EAS

---

## 🥇 Phase 1 : Préparation de la Mise à Jour

### 📋 Checklist Critique

1. **Synchroniser les versions** (si nécessaire) :
   - `mobile_app/app.config.js` : `version` et `runtimeVersion`
   - `mobile_app/package.json` : champ `"version"`
   - `package.json` (racine) : version globale

2. **Incrémenter le cache de données** (si modification des données) :
   - `mobile_app/hooks/game/useInitGame.ts` : `EVENTS_CACHE_VERSION`
   - Exemple : `const EVENTS_CACHE_VERSION = 12;`

3. **Tester les changements** :
   - Lancer l'app en mode développement
   - Vérifier que les fonctionnalités ciblées fonctionnent

---

## 🚀 Phase 2 : Déploiement OTA

### ⌨️ Commande de Déploiement

```bash
cd mobile_app
eas update --branch production --message "Description de la mise à jour"
```

### 📝 Exemples de Messages

- `"Fix crash in game screen"`
- `"Add new event filtering"`
- `"Update questions database"`
- `"Performance improvements"`

---

## 🏁 Phase 3 : Validation

### 📊 Suivi du Déploiement

1. **Vérifier le statut** :
```bash
eas update:list --branch production
```

2. **Monitorer sur EAS Dashboard** :
   - Allez sur https://expo.dev
   - Projet : `pierretulle/kiko`
   - Section "Updates"

3. **Tester sur device** :
   - Fermer et relancer l'app
   - Vérifier que la mise à jour s'applique

---

## 🔧 Cas d'Usage Courants

### 🐛 Correction de Bug
```bash
# Exemple : Fix d'un crash
eas update --branch production --message "Fix crash when loading events"
```

### 📡 Mise à Jour des Données
```bash
# Exemple : Nouvelles questions
eas update --branch production --message "Add 50 new history questions"
```

### ⚡ Amélioration de Performance
```bash
# Exemple : Optimisation
eas update --branch production --message "Optimize image loading performance"
```

---

## ⚠️ Limitations OTA

### ✅ Ce qui peut être mis à jour en OTA :
- Code JavaScript/TypeScript
- Assets (images, sons)
- Configuration Expo
- Données de l'application
- Hooks et composants React
- Écrans et navigation
- Logique métier

### ❌ Ce qui NE PEUT PAS être mis à jour en OTA :
- Version native (nécessite un nouveau build store)
- Permissions Android/iOS
- Configuration native (AndroidManifest, Info.plist)
- Dépendances natives (modules natifs)
- Changements dans `app.config.js` plugins natifs
- Modifications des métadonnées de l'application (nom, icône, splash)

---

## 🎯 Bonnes Pratiques

### 📋 Message Clair
- Décrire brièvement les changements
- Mentionner les bugs corrigés
- Indiquer les nouvelles fonctionnalités

### 🔄 Test Préalable
- Toujours tester en développement avant
- Vérifier les cas d'usage critiques
- Tester sur différents appareils si possible

### 📊 Monitoring
- Surveiller les taux d'adoption
- Vérifier l'absence de régressions
- Monitorer les crash reports

---

## 🆚 OTA vs Store Update

| Caractéristique | OTA | Store Update |
|----------------|-----|--------------|
| Délai | Quelques minutes | 1-3 jours |
| Processus | Commande CLI | Build + soumission |
| Portée | Utilisateurs actifs | Tous les utilisateurs |
| Limites | Code/assets uniquement | Tout y compris natif |

---

## � Vérification Pré-Déploiement

### Analyser les changements pour compatibilité OTA
Avant de déployer, vérifiez si vos changements sont compatibles OTA :

```bash
# Vérifier les fichiers modifiés
git status --porcelain

# Analyser les changements potentiels
git diff --name-only HEAD~1
```

### ✅ Changements compatibles OTA :
- Fichiers `.js`, `.jsx`, `.ts`, `.tsx` dans `app/`, `components/`, `hooks/`
- Fichiers dans `assets/` (images, sons)
- Fichiers de configuration JavaScript
- Données JSON dans `constants/` ou `data/`

### ❌ Changements nécessitant un build store :
- Modifications dans `android/` ou `ios/`
- Changements dans `app.config.js` (plugins, permissions)
- Ajout/suppression de dépendances natives
- Modifications de `package.json` (dépendances natives)

## �🚨 Dépannage

### Problème : Mise à jour ne s'applique pas
```bash
# Forcer la vérification des mises à jour
npx expo install --fix
eas update --branch production --force
```

### Problème : Erreur de runtimeVersion
```bash
# Vérifier la cohérence
grep -r "runtimeVersion" mobile_app/app.config.js
grep -r "version" mobile_app/package.json
```

### Problème : Build échoue
```bash
# Vérifier les erreurs
eas update --branch production --message "Test message" --dry-run
```

---

## 📚 Références

- [EAS Updates Documentation](https://docs.expo.dev/build-reference/updates/)
- [EAS Dashboard](https://expo.dev)
- [Runtime Version Guide](https://docs.expo.dev/updates/runtime-version/)

---

**Dernière mise à jour** : 05/05/2026
**Version du document** : 1.0
**Mainteneur** : Pierre / Antigravity

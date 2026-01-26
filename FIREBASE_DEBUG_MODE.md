# 🔍 Activer le Mode Debug Firebase Analytics

## Méthode 1 : Avec ADB (Recommandé)

### Prérequis
- Activer le "Mode développeur" sur votre téléphone Android
- Activer le "Débogage USB" dans les options développeur
- Connecter votre téléphone à votre ordinateur via USB

### Commandes ADB

```bash
# Vérifier que votre appareil est connecté
adb devices

# Activer le mode debug Firebase pour votre app
adb shell setprop debug.firebase.analytics.app com.kiko.kiko

# Vérifier que c'est activé
adb shell getprop debug.firebase.analytics.app
# Devrait afficher: com.kiko.kiko
```

### Désactiver le mode debug

```bash
# Pour désactiver après vos tests
adb shell setprop debug.firebase.analytics.app .none.
```

---

## Méthode 2 : Via le Code (Alternative)

Si vous ne pouvez pas utiliser ADB, on peut ajouter du code temporaire.

### Modification temporaire dans `app.config.js`

Ajouter dans `extra` :
```javascript
EXPO_PUBLIC_FIREBASE_DEBUG: 'true'
```

### Puis modifier `lib/firebase.ts` pour activer le debug

Mais cette méthode nécessite un rebuild, donc **la méthode ADB est plus rapide**.

---

## Vérification : Voir les événements en temps réel

### 1. Aller sur Firebase Console

1. Ouvrez https://console.firebase.google.com/
2. Sélectionnez votre projet Kiko
3. Analytics → DebugView (dans le menu de gauche)

### 2. Vérifier que votre appareil apparaît

- Si le mode debug est activé, vous verrez votre appareil dans DebugView
- Le nom de l'appareil s'affichera en haut

### 3. Jouer et observer les événements

- Lancez votre app
- Jouez une partie
- Les événements apparaissent **IMMÉDIATEMENT** dans DebugView (pas de délai de 2-4h)

---

## 🎯 Événements à surveiller

Une fois en mode debug, cherchez ces événements :

### ✅ `ad_load_error_detailed` ⭐
- Paramètre `error_code` : **C'EST LE PLUS IMPORTANT**
- Paramètre `ad_unit` : Quelle pub a échoué
- Paramètre `error_message` : Message d'erreur complet

### ✅ `ad_load_attempt`
- Confirme que le code essaie de charger les pubs

### ✅ `ad_show_attempt`
- Paramètre `is_loaded` : `false` signifie que la pub n'était pas chargée

---

## 📊 Exemple de ce que vous verrez

```
ad_load_attempt
  ├─ ad_type: "interstitial"
  ├─ ad_unit: "level_up"
  ├─ trigger: "initial_load"
  └─ level: 1

ad_load_error_detailed  ⭐ ⭐ ⭐
  ├─ ad_type: "interstitial"
  ├─ ad_unit: "level_up"
  ├─ error_code: "3"  ← VOICI LA RÉPONSE !
  ├─ error_message: "No fill"
  └─ level: 1

ad_show_attempt
  ├─ ad_type: "interstitial"
  ├─ ad_unit: "level_up"
  ├─ is_loaded: false
  └─ level: 1
```

---

## 🔢 Interprétation des codes d'erreur

| Code | Signification | Action |
|------|---------------|--------|
| **3** | NO_FILL - Pas d'inventaire publicitaire | ✅ Normal, attendre 7-14 jours |
| **1** | INVALID_REQUEST - Config incorrecte | ❌ Vérifier Ad Unit IDs |
| **2** | NETWORK_ERROR - Problème réseau | ⚠️ Problème utilisateur |
| **0** | INTERNAL_ERROR - Bug SDK | ❌ Contacter Google |

---

## ⚠️ Important

- Le mode debug ne change **RIEN** au comportement des publicités
- Il change seulement la façon dont Firebase collecte/affiche les analytics
- Les pubs continueront à ne pas s'afficher si elles ne s'affichent pas déjà
- Mais vous verrez **POURQUOI** en temps réel

---

**Date de création** : 3 janvier 2026
**Objectif** : Obtenir le code d'erreur AdMob immédiatement, sans attendre 2-4h

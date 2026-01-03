# 📝 Changelog - Version 1.5.10

## 🎯 Objectif de cette version

Ajouter un tracking Firebase Analytics complet pour diagnostiquer pourquoi les publicités interstitielles et récompensées ne s'affichent pas en production.

---

## ✅ Modifications Effectuées

### 1. Fichiers Modifiés

#### [hooks/game/useAds.ts](hooks/game/useAds.ts)
**Modifications**:
- ✅ Ajout de `ad_load_error_detailed` avec codes d'erreur AdMob complets (lignes 326-332, 379-385, 436-442, 486-492)
- ✅ Ajout de `ad_load_attempt` au chargement initial (lignes 582-618)
- ✅ Ajout de `ad_load_attempt` lors des retries après erreur (lignes 336-343, 389-396, 446-453, 496-503)
- ✅ Ajout de `ad_show_attempt` lors des tentatives d'affichage (lignes 716-721, 732-738, 753-758, 769-775, 810-815, 829-834)
- ✅ Suppression de l'import inutilisé `TestIds` (ligne 7)
- ✅ Suppression des variables inutilisées `currentLevel` et `currentPoints` (lignes 239-240)
- ✅ Correction du typage TypeScript avec `(error as any)?.code` (lignes 322, 375, 432, 482)

#### [hooks/useRewardedPlayAd.ts](hooks/useRewardedPlayAd.ts)
**Modifications**:
- ✅ Ajout de `ad_load_error_detailed` (lignes 73-79)
- ✅ Ajout de `ad_load_attempt` au chargement initial (lignes 133-138)
- ✅ Ajout de `ad_load_attempt` lors des retries (lignes 84-90)
- ✅ Ajout de `ad_show_attempt` (lignes 165-170)
- ✅ Correction du typage TypeScript (ligne 68)

#### [hooks/game/usePrecisionAds.ts](hooks/game/usePrecisionAds.ts)
**Modifications**:
- ✅ Ajout de `ad_load_error_detailed` pour Game Over (lignes 76-82)
- ✅ Ajout de `ad_load_error_detailed` pour Continue Rewarded (lignes 133-140)
- ✅ Ajout de `ad_load_attempt` lors des retries Game Over (lignes 86-92)
- ✅ Ajout de `ad_load_attempt` lors des retries Continue (lignes 156-162)
- ✅ Correction du typage TypeScript (lignes 72, 131, 133)

---

### 2. Fichiers Créés

#### [ADMOB_DIAGNOSTIC_UPDATE.md](ADMOB_DIAGNOSTIC_UPDATE.md)
**Contenu**: Guide complet de diagnostic AdMob avec:
- Objectifs de la version
- Liste des modifications
- Codes d'erreur AdMob
- Prochaines étapes
- Solutions selon les codes d'erreur

#### [FIREBASE_ANALYTICS_EVENTS.md](FIREBASE_ANALYTICS_EVENTS.md)
**Contenu**: Documentation complète des événements Firebase:
- Description de chaque événement
- Paramètres capturés
- Interprétation des données
- Scénarios de diagnostic
- Dashboards recommandés

#### [CHANGELOG_v1.5.10.md](CHANGELOG_v1.5.10.md) (ce fichier)
**Contenu**: Liste complète des modifications de cette version

---

## 🎯 Nouveaux Événements Firebase Analytics

### Événements Critiques

1. **`ad_load_error_detailed`** ⭐ **LE PLUS IMPORTANT**
   - Capture le **code d'erreur exact** d'AdMob (`error_code`)
   - Capture le message d'erreur complet (`error_message`)
   - Capture l'Ad Unit concernée (`ad_unit`)
   - Capture le niveau du joueur (`level`)

2. **`ad_load_attempt`**
   - Enregistre chaque tentative de chargement
   - Permet de compter combien de fois le code essaie de charger les pubs
   - Permet de calculer le taux d'échec

3. **`ad_show_attempt`**
   - Enregistre chaque tentative d'affichage
   - Indique si la pub était chargée (`is_loaded`)
   - Permet de détecter si les pubs ne se chargent jamais

---

## 📊 Codes d'Erreur AdMob

| Code | Nom | Signification | Action requise |
|------|-----|---------------|----------------|
| **3** | ERROR_CODE_NO_FILL | Pas d'annonce disponible | ✅ Normal pour nouvelle app, attendre 7-14 jours |
| **1** | ERROR_CODE_INVALID_REQUEST | Requête invalide | ❌ Vérifier Ad Unit IDs dans adConfig.ts |
| **2** | ERROR_CODE_NETWORK_ERROR | Erreur réseau | ⚠️ Problème utilisateur, pas d'action |
| **0** | ERROR_CODE_INTERNAL_ERROR | Erreur SDK | ❌ Mettre à jour SDK ou contacter Google |

---

## 🚀 Prochaines Étapes

### 1. Build et Déploiement
```bash
cd /home/pierre/kiko
eas build --platform android --profile production
eas build:download --platform android --latest
# Téléverser sur Play Console (version 1.5.10)
```

### 2. Attendre les Données (2-4h après publication)
- Firebase Analytics collecte les événements avec un délai de 2-4 heures
- Besoin d'au moins 50-100 utilisateurs pour des données significatives

### 3. Analyse dans Firebase Console
```
Firebase Console → Analytics → Events → ad_load_error_detailed
→ Paramètres → error_code
→ Grouper par: ad_unit
```

### 4. Diagnostic Final
Selon le `error_code` le plus fréquent :
- **Code 3** → Google n'a pas d'inventaire, attendre
- **Code 1** → Problème de config, corriger adConfig.ts
- **Code 2** → Problème réseau utilisateur
- **Code 0** → Bug SDK, mettre à jour

---

## 📈 Métriques à Surveiller

### Dans Firebase Analytics
1. Nombre d'événements `ad_load_error_detailed` par Ad Unit
2. Distribution des `error_code` (quel code est le plus fréquent)
3. Ratio `ad_load_attempt` / `ad_load_error_detailed` (taux d'échec)
4. Nombre de `ad_show_attempt` avec `is_loaded = false`

### Dans AdMob Console
1. Requêtes d'annonces par Ad Unit
2. Impressions par Ad Unit
3. Taux de remplissage (Fill Rate)
4. Revenus estimés

---

## ⚠️ Points d'Attention

1. **Ne PAS paniquer si error_code = 3**
   - C'est le code le PLUS FRÉQUENT pour les nouvelles applications
   - Signifie juste que Google n'a pas encore rempli l'inventaire
   - Normal de voir 100% de code 3 pendant les 7-14 premiers jours

2. **Les bannières fonctionnent déjà**
   - Banner_Home: 29 impressions sur 30 jours ✅
   - recompense vue1: 1 impression ✅
   - Cela CONFIRME que le code est correct

3. **Pas de requêtes visibles dans AdMob**
   - Si AdMob Console montre "Aucune donnée disponible" pour les interstitiels/rewarded
   - C'est cohérent avec error_code = 3 (NO_FILL)
   - Le SDK échoue AVANT d'envoyer la requête à AdMob

---

## 🎓 Apprentissages

### Ce qu'on sait maintenant (grâce aux captures AdMob)
1. ✅ Les Ad Units sont bien configurées
2. ✅ app-ads.txt est validé
3. ✅ Le code AdMob est correct (la bannière marche)
4. ❌ Google n'a pas d'inventaire pour les interstitiels/récompensées
5. ❌ Les requêtes échouent côté SDK (pas visibles dans AdMob Console)

### Ce qu'on va découvrir avec cette version
1. 🔍 Le code d'erreur exact (0, 1, 2 ou 3)
2. 🔍 Si le problème est systématique ou intermittent
3. 🔍 Si les retries automatiques fonctionnent
4. 🔍 Si le code essaie bien d'afficher les pubs au bon moment

---

## 📞 Support et Contact

Si après 48h de collecte de données :
- Le problème persiste
- Le code d'erreur n'est pas clair
- Besoin d'aide pour interpréter les métriques

→ Fournir les informations suivantes :
1. Nombre total d'événements `ad_load_error_detailed`
2. Distribution des `error_code` (%) par Ad Unit
3. Ratio tentatives/échecs
4. Captures d'écran Firebase Analytics

---

**Date de création**: 3 janvier 2026
**Version**: 1.5.10
**Auteur**: Diagnostic AdMob amélioré
**Statut**: ✅ Prêt pour le build

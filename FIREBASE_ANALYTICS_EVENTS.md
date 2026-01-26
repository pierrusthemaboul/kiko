# 📊 Événements Firebase Analytics - Diagnostic AdMob Complet

## Version: 1.5.10+

Ce document liste tous les événements Firebase Analytics ajoutés pour diagnostiquer les problèmes AdMob.

---

## 🎯 Événements Principaux de Diagnostic

### 1. `ad_load_error_detailed` ⭐ **LE PLUS IMPORTANT**

**Description**: Capture les détails complets des erreurs de chargement de publicités.

**Paramètres**:
- `ad_type` (string): Type de publicité
  - `"interstitial"` - Publicité interstitielle
  - `"rewarded"` - Publicité récompensée
- `ad_unit` (string): Nom de l'unité publicitaire
  - `"generic"` - Interstitiel générique
  - `"level_up"` - Interstitiel level up
  - `"game_over"` - Interstitiel game over
  - `"extra_life"` - Récompensée vie supplémentaire
  - `"extra_play"` - Récompensée partie supplémentaire
  - `"precision_game_over"` - Interstitiel precision game over
  - `"precision_continue"` - Récompensée precision continue
- `error_code` (string): **CODE D'ERREUR ADMOB** 🔥
  - `"0"` = ERROR_CODE_INTERNAL_ERROR (Erreur interne SDK)
  - `"1"` = ERROR_CODE_INVALID_REQUEST (Requête invalide - problème config)
  - `"2"` = ERROR_CODE_NETWORK_ERROR (Erreur réseau)
  - `"3"` = ERROR_CODE_NO_FILL (Pas d'annonce disponible - **LE PLUS FRÉQUENT**)
- `error_message` (string): Message d'erreur complet
- `error_domain` (string): Domaine de l'erreur (seulement pour precision_continue)
- `level` (number): Niveau du joueur au moment de l'erreur

**Quand déclenché**: À chaque échec de chargement d'une publicité

**Exemple d'utilisation Firebase Console**:
```
Events → ad_load_error_detailed → Paramètres
Filtrer par: error_code = "3"
Grouper par: ad_unit
```

**Interprétation**:
- Si `error_code = "3"` pour toutes les Ad Units qui ne marchent pas → Google n'a pas d'inventaire publicitaire
- Si `error_code = "1"` → Problème de configuration (vérifier les Ad Unit IDs dans adConfig.ts)
- Si `error_code = "2"` → Problème réseau utilisateur
- Si `error_code = "0"` → Bug du SDK AdMob

---

### 2. `ad_load_attempt`

**Description**: Enregistre chaque tentative de chargement d'une publicité.

**Paramètres**:
- `ad_type` (string): `"interstitial"` ou `"rewarded"`
- `ad_unit` (string): Nom de l'unité publicitaire
- `trigger` (string): Raison du chargement
  - `"initial_load"` - Chargement initial au démarrage de l'app
  - `"retry_after_error"` - Rechargement après une erreur
- `previous_error_code` (string): Code de l'erreur précédente (seulement si trigger = "retry_after_error")
- `level` (number): Niveau du joueur

**Quand déclenché**:
- Au démarrage de l'app (pour chaque Ad Unit)
- 30 secondes après chaque erreur de chargement (retry automatique)

**Utilité**:
- Compter combien de fois le code **essaie** de charger les pubs
- Vérifier si les retries automatiques fonctionnent
- Comparer avec `ad_load_error_detailed` pour calculer le taux d'échec

**Exemple d'analyse**:
```
Si ad_load_attempt (game_over) = 100 événements
Et ad_load_error_detailed (game_over, code=3) = 100 événements
→ Le code essaie bien de charger, mais Google n'a JAMAIS de pubs disponibles
```

---

### 3. `ad_show_attempt`

**Description**: Enregistre chaque tentative d'affichage d'une publicité.

**Paramètres**:
- `ad_type` (string): `"interstitial"` ou `"rewarded"`
- `ad_unit` (string): Nom de l'unité publicitaire
- `is_loaded` (boolean): La pub était-elle chargée au moment de l'affichage ?
  - `true` - Pub chargée, affichage réussi
  - `false` - Pub PAS chargée, affichage impossible
- `fallback_loaded` (boolean): La pub de fallback était-elle chargée ? (seulement pour interstitiels)
- `level` (number): Niveau du joueur

**Quand déclenché**: À chaque fois que le code essaie d'afficher une pub (ex: au game over, level up, etc.)

**Utilité**:
- Vérifier si le code **essaie bien** d'afficher les pubs
- Détecter si les pubs ne se chargent jamais (`is_loaded = false`)
- Comparer avec les impressions AdMob Console

**Exemple d'analyse**:
```
Si ad_show_attempt (game_over, is_loaded=false) = 50 événements
→ Le joueur a game over 50 fois, mais la pub n'était JAMAIS chargée
→ Confirme que le problème est le chargement, pas l'affichage
```

---

## 📈 Événements Existants (déjà présents avant 1.5.10)

Ces événements existaient déjà mais sont toujours utiles pour le diagnostic :

### 4. `error_occurred`

**Paramètres**:
- `error_type` (string): Type d'erreur
  - `"ad_load_error"` - Erreur de chargement de pub
  - Autres types d'erreurs de l'app
- `error_message` (string): Message d'erreur
- `error_context` (string): Contexte (nom du hook/composant)

**Quand déclenché**: À chaque erreur dans l'app (pas seulement AdMob)

---

## 🔍 Comment Diagnostiquer avec Firebase Analytics

### Étape 1: Vérifier les codes d'erreur

1. Va dans Firebase Console → Analytics → Events
2. Cherche `ad_load_error_detailed`
3. Clique dessus → Paramètres → Regarde `error_code`
4. Note le code le plus fréquent

### Étape 2: Analyser par Ad Unit

1. Dans `ad_load_error_detailed`, groupe par `ad_unit`
2. Pour chaque Ad Unit qui ne marche pas, note:
   - Nombre d'erreurs
   - Code d'erreur (`error_code`)
   - Message d'erreur (`error_message`)

### Étape 3: Comparer tentatives vs erreurs

1. Compare le nombre de `ad_load_attempt` vs `ad_load_error_detailed` pour chaque Ad Unit
2. Si égaux (100% d'échec) → Problème systématique
3. Si différents → Problème intermittent

### Étape 4: Vérifier les tentatives d'affichage

1. Cherche `ad_show_attempt`
2. Filtre par `is_loaded = false`
3. Si nombreux événements → Les pubs ne se chargent jamais avant l'affichage

---

## 📊 Tableaux de Bord Firebase Recommandés

### Dashboard 1: Vue d'ensemble des erreurs

**Événement**: `ad_load_error_detailed`
**Dimensions**: `ad_unit`, `error_code`
**Métriques**: Nombre d'événements
**Période**: 7 derniers jours

**Objectif**: Voir rapidement quelles Ad Units ont des problèmes et pourquoi

---

### Dashboard 2: Taux de réussite du chargement

**Événements comparés**:
- `ad_load_attempt` (tentatives)
- `ad_load_error_detailed` (échecs)

**Formule**: `(tentatives - échecs) / tentatives * 100 = % de réussite`

**Objectif**: Mesurer la santé du système publicitaire

---

### Dashboard 3: Analyse des affichages

**Événement**: `ad_show_attempt`
**Filtre**: `is_loaded = false`
**Dimension**: `ad_unit`
**Métrique**: Nombre d'événements

**Objectif**: Identifier les pubs qui ne se chargent jamais à temps

---

## 🎯 Scénarios de Diagnostic

### Scénario A: Aucune pub ne se charge

**Symptômes**:
- `ad_load_error_detailed` : error_code = "3" pour TOUTES les Ad Units
- `ad_show_attempt` : is_loaded = false pour TOUTES les tentatives
- AdMob Console : Aucune requête visible

**Diagnostic**: Code fonctionne, mais Google n'a pas d'inventaire publicitaire

**Solution**: Attendre 7-14 jours que Google remplisse l'inventaire

---

### Scénario B: Problème de configuration

**Symptômes**:
- `ad_load_error_detailed` : error_code = "1" (INVALID_REQUEST)
- `ad_load_attempt` : Beaucoup de tentatives
- AdMob Console : Aucune requête visible

**Diagnostic**: Ad Unit IDs incorrects ou problème de configuration

**Solution**: Vérifier les IDs dans [adConfig.ts](lib/config/adConfig.ts)

---

### Scénario C: Problème réseau

**Symptômes**:
- `ad_load_error_detailed` : error_code = "2" (NETWORK_ERROR)
- Événements intermittents

**Diagnostic**: Problème de connectivité des utilisateurs

**Solution**: Aucune action nécessaire (problème côté utilisateur)

---

### Scénario D: Bug du SDK

**Symptômes**:
- `ad_load_error_detailed` : error_code = "0" (INTERNAL_ERROR)
- Messages d'erreur variés

**Diagnostic**: Bug du SDK AdMob

**Solution**: Mettre à jour `react-native-google-mobile-ads` ou contacter le support Google

---

## 📝 Notes Importantes

1. **Délai de collecte**: Les événements Firebase peuvent prendre 2-4 heures pour apparaître dans la console
2. **Échantillonnage**: Firebase peut échantillonner les données si le volume est très élevé
3. **Rétention**: Les événements sont conservés 60 jours par défaut
4. **Export BigQuery**: Pour une analyse avancée, exporter vers BigQuery

---

## 🚀 Prochaines Étapes

Une fois la version 1.5.10+ déployée :

1. ✅ Attendre 2-4 heures pour collecte des données
2. ✅ Aller dans Firebase Analytics → Events → `ad_load_error_detailed`
3. ✅ Noter le code d'erreur le plus fréquent
4. ✅ Me communiquer le code pour diagnostic final

---

**Date de création**: 3 janvier 2026
**Version**: 1.5.10+
**Auteur**: Diagnostic AdMob amélioré

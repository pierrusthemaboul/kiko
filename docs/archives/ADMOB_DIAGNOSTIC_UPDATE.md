# 📊 Diagnostic AdMob Amélioré - Version 1.5.10

## 🎯 Objectif

Capturer les codes d'erreur exacts d'AdMob pour diagnostiquer pourquoi les publicités interstitielles et récompensées ne s'affichent pas en production, alors que les bannières fonctionnent.

## ✅ Modifications effectuées

### Fichiers modifiés

1. **[hooks/game/useAds.ts](hooks/game/useAds.ts)**
   - Ajout de tracking détaillé pour les 4 types d'annonces :
     - Generic Interstitial (ligne 321-336)
     - LevelUp Interstitial (ligne 365-380)
     - GameOver Interstitial (ligne 413-428)
     - Rewarded Extra Life (ligne 454-469)

2. **[hooks/useRewardedPlayAd.ts](hooks/useRewardedPlayAd.ts)**
   - Ajout de tracking détaillé pour Rewarded Extra Play (ligne 65-85)

3. **[hooks/game/usePrecisionAds.ts](hooks/game/usePrecisionAds.ts)**
   - Ajout de tracking détaillé pour :
     - Precision Game Over Interstitial (ligne 69-87)
     - Precision Continue Rewarded (ligne 119-150)

### Nouveau événement Firebase Analytics

**Événement créé:** `ad_load_error_detailed`

**Paramètres capturés:**
- `ad_type`: "interstitial" ou "rewarded"
- `ad_unit`: nom de l'unité publicitaire (ex: "generic", "level_up", "extra_life")
- `error_code`: **CODE D'ERREUR ADMOB** (le plus important !)
- `error_message`: message d'erreur complet
- `error_domain`: domaine de l'erreur (seulement pour precision_continue)
- `level`: niveau du joueur au moment de l'erreur

## 🔍 Codes d'erreur AdMob à surveiller

Une fois la version 1.5.10 déployée, vérifiez dans Firebase Analytics les valeurs de `error_code`:

| Code | Nom | Signification | Action requise |
|------|-----|---------------|----------------|
| **3** | ERROR_CODE_NO_FILL | Pas d'annonce disponible (inventaire vide) | Attendre que Google remplisse l'inventaire, vérifier les paramètres de ciblage dans AdMob |
| **1** | ERROR_CODE_INVALID_REQUEST | Requête invalide (problème de configuration) | Vérifier les Ad Unit IDs dans adConfig.ts |
| **2** | ERROR_CODE_NETWORK_ERROR | Erreur réseau | Problème côté utilisateur |
| **0** | ERROR_CODE_INTERNAL_ERROR | Erreur interne du SDK | Bug AdMob SDK, contacter le support |

## 📋 Prochaines étapes

### 1. **Build et déploiement**
```bash
# Créer le nouveau build avec diagnostic amélioré
eas build --platform android --profile production

# Télécharger le .aab
eas build:download --platform android --latest

# Publier sur Play Store (version 1.5.10)
```

### 2. **Attendre les données (2-4 heures après publication)**

Une fois que des utilisateurs auront téléchargé la version 1.5.10 :

1. Aller dans Firebase Console → Analytics → Events
2. Chercher l'événement `ad_load_error_detailed`
3. Cliquer dessus pour voir les paramètres
4. Noter les valeurs de `error_code` les plus fréquentes

### 3. **Analyser les résultats**

**Si error_code = 3 (NO_FILL):**
- ✅ Votre code fonctionne correctement
- ❌ Google n'a pas d'annonces à afficher
- **Solution:** Attendre que Google remplisse l'inventaire (peut prendre 7-14 jours pour une nouvelle app)
- **Alternative:** Vérifier les paramètres de ciblage dans AdMob Console

**Si error_code = 1 (INVALID_REQUEST):**
- ❌ Problème de configuration
- **Solution:** Vérifier que les Ad Unit IDs dans adConfig.ts correspondent exactement à ceux dans AdMob Console

**Si error_code = 2 (NETWORK_ERROR):**
- Problème de connectivité des utilisateurs
- Pas d'action nécessaire

**Si error_code = 0 (INTERNAL_ERROR):**
- Bug du SDK AdMob
- **Solution:** Mettre à jour `react-native-google-mobile-ads` ou contacter le support Google

## 🎓 Pourquoi les bannières fonctionnent mais pas les autres ?

**Hypothèses possibles:**

1. **Inventaire différent** (le plus probable)
   - Google a de l'inventaire pour les bannières mais pas pour les interstitiels/récompensées
   - Les bannières sont plus faciles à remplir (format standard, moins intrusif)
   - Les interstitiels/récompensées nécessitent plus de temps d'approbation

2. **Politique publicitaire**
   - Les bannières sont approuvées automatiquement
   - Les interstitiels/récompensées nécessitent une vérification manuelle par Google
   - Cette vérification peut prendre 7-14 jours

3. **Taux de remplissage (Fill Rate)**
   - Même avec l'app approuvée, le fill rate peut être faible au début
   - Google teste votre app avec de vraies annonces progressivement

## 📞 Support

Si après analyse des codes d'erreur le problème persiste :

1. **Si error_code = 3 pendant > 14 jours:**
   - Contacter le support AdMob
   - Fournir l'App ID: ca-app-pub-7809209690404525~1711130974
   - Mentionner que les bannières fonctionnent mais pas les interstitiels/récompensées

2. **Si error_code = 1:**
   - Revérifier adConfig.ts ligne par ligne
   - Comparer avec les IDs dans AdMob Console

---

**Date de création:** 3 janvier 2026
**Version de l'app:** 1.5.10 (à venir)
**Objectif:** Obtenir les codes d'erreur précis pour diagnostiquer le problème d'affichage des publicités

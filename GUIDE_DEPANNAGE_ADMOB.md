# 🔧 Guide de Dépannage AdMob

## Problème : Les publicités ne s'affichent pas en production

### ✅ Vérifications à faire

#### 1. Console AdMob (https://apps.admob.com)

- [ ] **Compte AdMob configuré**
  - Vérifiez que votre compte AdMob est complètement configuré
  - Vérifiez que les informations de paiement sont renseignées (même si vous n'avez pas encore atteint le seuil)

- [ ] **Application enregistrée**
  - Vérifiez que l'application `com.pierretulle.juno2` est enregistrée
  - App ID Android : `ca-app-pub-7809209690404525~1711130974`

- [ ] **Ad Units créés et ACTIVÉS**
  ```
  BANNER_HOME: ca-app-pub-7809209690404525/2401416565
  INTERSTITIAL_GAME_OVER: ca-app-pub-7809209690404525/2263906247
  INTERSTITIAL_LEVEL_UP: ca-app-pub-7809209690404525/5890695588
  REWARDED_EXTRA_LIFE: ca-app-pub-7809209690404525/7365559514
  REWARDED_EXTRA_PLAY: ca-app-pub-7809209690404525/9909124779
  INTERSTITIAL_PRECISION_GAME_OVER: ca-app-pub-7809209690404525/9234461062
  REWARDED_CONTINUE_PRECISION: ca-app-pub-7809209690404525/2884675132
  ```

- [ ] **Médiation configurée (optionnel mais recommandé)**
  - Activez les réseaux de médiation pour augmenter le fill rate

#### 2. Délais de mise en service

⏰ **IMPORTANT** : Après la première publication sur le Play Store, il faut :
- **24-48 heures** pour que les publicités commencent à s'afficher
- Pendant ce temps, AdMob analyse votre app et configure les campagnes

**Actions** :
- Si votre app vient d'être publiée, **attendez 48h**
- Vérifiez dans AdMob > Tableau de bord > Requêtes d'annonces (devrait augmenter après 24-48h)

#### 3. Vérifier les logs de l'application

Pour activer les logs détaillés, utilisez `adb logcat` :

```bash
# Connectez votre téléphone en USB avec l'app Play Store ouverte
adb logcat | grep -E "BANNER_HOME|AdMob|Ads"
```

**Logs attendus** :
- ✅ `[BANNER_HOME] Ad loaded successfully` → Pub chargée
- ❌ `[BANNER_HOME] Failed to load ad` → Erreur (voir le code d'erreur)

**Codes d'erreur courants** :
- `ERROR_CODE_NO_FILL` (3) : Pas d'inventaire publicitaire disponible
  - **Cause** : Votre app est trop récente ou pas assez de demandes
  - **Solution** : Attendez 24-48h, activez la médiation

- `ERROR_CODE_NETWORK_ERROR` (2) : Problème réseau
  - **Cause** : L'appareil n'a pas de connexion internet
  - **Solution** : Vérifiez la connexion

- `ERROR_CODE_INVALID_REQUEST` (1) : Requête invalide
  - **Cause** : Problème dans la configuration (ID incorrect, permissions manquantes)
  - **Solution** : Vérifiez les IDs dans `adConfig.ts` et les permissions dans `AndroidManifest.xml`

- `ERROR_CODE_APP_ID_MISSING` (8) : App ID manquant
  - **Cause** : L'App ID n'est pas configuré dans `app.config.js`
  - **Solution** : Vérifiez que `androidAppId` est bien présent

#### 4. Vérifier le consentement RGPD

Le consentement RGPD peut bloquer les publicités si :
- L'utilisateur n'a pas donné son consentement
- Le formulaire de consentement ne s'est pas affiché

**Vérification** :
```bash
# Logs du consentement
adb logcat | grep "AdConsent"
```

**Logs attendus** :
- `[AdConsent] Consent info` → Informations de consentement
- `[AdConsent] Ad personalization: ENABLED/DISABLED` → État de la personnalisation

**Pour tester en France (EEA)** :
- Le formulaire de consentement devrait s'afficher au premier lancement
- Vous pouvez le réafficher via les paramètres de l'app (si implémenté)

#### 5. Vérifier les permissions Android

Dans `AndroidManifest.xml`, vérifiez que ces permissions sont présentes :

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="replace" />
<uses-permission android:name="android.permission.ACCESS_ADSERVICES_AD_ID" />
```

#### 6. Tester avec une version de développement

Pour vérifier que le code fonctionne :

1. Compilez une version de développement :
   ```bash
   npx expo run:android
   ```

2. En mode développement (`__DEV__ = true`), des publicités de test s'afficheront
3. Si les pubs de test s'affichent → Le code fonctionne, c'est un problème de configuration AdMob
4. Si les pubs de test ne s'affichent pas → Problème dans le code

## 🎯 Actions recommandées dans votre cas

Vous avez dit que vous venez de publier sur le Play Store et qu'aucune pub ne s'affiche.

### Scénario le plus probable : **Délai de mise en service**

1. **Attendez 48 heures** après la publication
2. Vérifiez dans AdMob > Tableau de bord :
   - Nombre de requêtes d'annonces (devrait être > 0 après 24-48h)
   - Taux de remplissage (devrait augmenter progressivement)

### Vérifications immédiates :

1. **Console AdMob** :
   - [ ] Tous les Ad Units sont créés et **ACTIVÉS** (pas en brouillon)
   - [ ] L'App ID correspond bien à celui dans `app.config.js`
   - [ ] Le compte AdMob est complètement configuré

2. **Logs de l'application** :
   ```bash
   # Récupérez les logs pour voir les erreurs
   adb logcat | grep -E "BANNER_HOME|AdMob|AdConsent" > admob_logs.txt
   ```

   Cherchez :
   - Des erreurs de chargement de publicité
   - Le code d'erreur (ERROR_CODE_NO_FILL, etc.)

3. **Version de développement** :
   - Compilez en dev et vérifiez que les pubs de test s'affichent
   - Cela confirmera que le code fonctionne

## 📊 Tableau de bord AdMob

Après 24-48h, vous devriez voir dans AdMob :

| Métrique | Valeur attendue |
|----------|-----------------|
| Requêtes d'annonces | > 0 (augmente avec le nombre de sessions) |
| Impressions | > 0 (peut être faible au début) |
| Taux de remplissage | 10-60% (augmente avec le temps) |
| eCPM | Variable (dépend de votre audience) |

**Si après 48h** :
- Requêtes = 0 → Problème dans le code (les requêtes ne sont pas envoyées)
- Requêtes > 0, Impressions = 0 → Problème AdMob (pas d'inventaire, configuration)

## 🛠️ Outils de diagnostic

### 1. Script de diagnostic

Exécutez le script de diagnostic :

```bash
npx ts-node scripts/diagnose-admob.ts
```

### 2. Test de chargement manuel

Ajoutez temporairement ce code dans `vue1.tsx` pour forcer le chargement :

```typescript
useEffect(() => {
  console.log('[DEBUG] Ad Unit ID:', getAdUnitId('BANNER_HOME'));
  console.log('[DEBUG] Ad Request Options:', getAdRequestOptions());
  console.log('[DEBUG] IS_TEST_BUILD:', IS_TEST_BUILD);
}, []);
```

## 📞 Support

Si après 48h les publicités ne s'affichent toujours pas :

1. **Vérifiez les logs** et notez les codes d'erreur
2. **Contactez le support AdMob** avec :
   - App ID
   - Ad Unit IDs
   - Codes d'erreur des logs
   - Captures d'écran du tableau de bord AdMob

## ✅ Checklist complète

- [ ] Compte AdMob configuré (paiement, etc.)
- [ ] Application enregistrée avec le bon package name
- [ ] Tous les Ad Units créés et **ACTIVÉS**
- [ ] App ID dans `app.config.js` est correct
- [ ] Permissions dans `AndroidManifest.xml` sont présentes
- [ ] Attendu 48h après la publication
- [ ] Logs vérifiés (pas d'erreurs critiques)
- [ ] Version de dev testée (pubs de test OK)
- [ ] Tableau de bord AdMob montre des requêtes

## 🎓 Ressources

- [Documentation AdMob](https://developers.google.com/admob/android/quick-start)
- [Codes d'erreur AdMob](https://developers.google.com/android/reference/com/google/android/gms/ads/AdError)
- [Guide de démarrage React Native Google Mobile Ads](https://docs.page/invertase/react-native-google-mobile-ads)

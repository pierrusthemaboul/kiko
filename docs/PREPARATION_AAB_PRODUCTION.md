# Préparation du fichier AAB pour production

Ce document liste toutes les étapes et modifications nécessaires avant de créer le fichier AAB final pour le Google Play Store.

## 📋 Checklist pré-production

### 1. Configuration Firebase

#### 1.1 Activer Firebase Analytics en production
- [ ] Vérifier que `google-services.json` contient les bonnes clés de production
- [ ] S'assurer que le projet Firebase est en mode production (pas de test)
- [ ] Vérifier les quotas Firebase Analytics dans la console Firebase

#### 1.2 Activer Firebase Crashlytics
⚠️ **IMPORTANT** : Crashlytics doit être activé UNIQUEMENT lors de la création du AAB final, sinon l'app crash en dev.

- [ ] Vérifier que `@react-native-firebase/crashlytics` est installé
- [ ] Activer Crashlytics dans `app.json` / `app.config.js` si désactivé en dev
- [ ] Dans la console Firebase : Activer Crashlytics pour le projet
- [ ] Tester une première build pour vérifier que Crashlytics fonctionne

#### 1.3 Migrer les API Firebase dépréciées (optionnel mais recommandé)
Fichier : `lib/firebase.ts`

Remplacer :
```typescript
// Ligne 184
await logAppOpen(analyticsInstance);
// Par :
await logEvent(analyticsInstance, 'app_open');

// Ligne 173
await logScreenView(analyticsInstance, { screen_name: name, screen_class: screenClass || name });
// Par :
await logEvent(analyticsInstance, 'screen_view', { screen_name: name, screen_class: screenClass || name });
```

### 2. Configuration des publicités (Google AdMob)

#### 2.1 Vérifier les Ad Unit IDs
Fichier : `lib/config/adConfig.ts`

- [ ] S'assurer que tous les Ad Unit IDs sont configurés pour la production (pas de Test IDs)
- [ ] Vérifier les IDs pour :
  - Banner Home
  - Interstitial Generic
  - Interstitial Level Up
  - Interstitial Game Over
  - Rewarded Extra Life
  - Rewarded Extra Play
  - Rewarded Continue (Precision)

#### 2.2 Configuration du consentement GDPR
- [ ] Vérifier que le système UMP (User Messaging Platform) est bien configuré
- [ ] Tester le formulaire de consentement sur un appareil européen
- [ ] Vérifier que les préférences de consentement sont bien sauvegardées

### 3. Version et build number

#### 3.1 Mettre à jour les versions
Fichier : `app.json` ou `app.config.js`

- [ ] Incrémenter `version` (ex: "1.0.0" → "1.1.0")
- [ ] Incrémenter `versionCode` (ex: 1 → 2)
- [ ] Vérifier que `android.package` correspond au bundle ID du Play Store

#### 3.2 Vérifier les permissions
Fichier : `app.json` → `android.permissions`

- [ ] Supprimer les permissions inutiles
- [ ] S'assurer que seules les permissions nécessaires sont présentes :
  - `INTERNET` (requis pour Firebase, ads, Supabase)
  - `ACCESS_NETWORK_STATE` (optionnel, pour détecter la connectivité)
  - Autres permissions selon les besoins

### 4. Configuration de sécurité

#### 4.1 Vérifier les variables d'environnement
- [ ] Vérifier que `.env` n'est PAS inclus dans le build
- [ ] S'assurer que les secrets Supabase sont bien configurés via `app.config.js`
- [ ] Vérifier que `SUPABASE_SERVICE_ROLE_KEY` n'est PAS exposé côté client

#### 4.2 ProGuard / R8 (obfuscation du code)
- [ ] Activer la minification dans `android/app/build.gradle` :
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

#### 4.3 Signing configuration
Fichier : `android/app/build.gradle`

- [ ] Configurer le keystore de signature :
```gradle
signingConfigs {
    release {
        storeFile file('my-release-key.keystore')
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias System.getenv("KEY_ALIAS")
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
```
- [ ] Créer le keystore si ce n'est pas déjà fait :
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
- [ ] **SAUVEGARDER LE KEYSTORE** dans un endroit sûr (Google Drive, 1Password, etc.)

### 5. Assets et ressources

#### 5.1 Icônes et splash screen
- [ ] Vérifier que l'icône de l'app est présente et optimisée
- [ ] Vérifier le splash screen
- [ ] Optimiser les images (compression, format WebP si possible)

#### 5.2 Sons et assets
- [ ] Vérifier que tous les fichiers audio sont présents dans `assets/sounds/`
- [ ] S'assurer qu'ils sont correctement référencés dans le code

### 6. Tests finaux

#### 6.1 Tests fonctionnels
- [ ] Tester le mode Classique de bout en bout
- [ ] Tester le mode Précision de bout en bout
- [ ] Tester les publicités (interstitial, rewarded)
- [ ] Tester le système de vies / parties
- [ ] Tester les quêtes (daily, weekly, monthly)
- [ ] Tester les classements (leaderboards)
- [ ] Tester la connexion / déconnexion
- [ ] Tester le formulaire de consentement GDPR

#### 6.2 Tests de performance
- [ ] Vérifier qu'il n'y a pas de memory leaks
- [ ] Vérifier que l'app ne crash pas après plusieurs parties
- [ ] Tester sur plusieurs appareils (différentes versions Android)

### 7. Build du AAB

#### 7.1 Nettoyer le projet
```bash
cd android
./gradlew clean
cd ..
rm -rf node_modules
pnpm install
```

#### 7.2 Prébuild avec Expo
```bash
npx expo prebuild --platform android --clean
```

#### 7.3 Build du AAB avec Gradle
```bash
cd android
./gradlew bundleRelease
```

Le fichier AAB sera généré dans :
```
android/app/build/outputs/bundle/release/app-release.aab
```

#### 7.4 Build avec EAS (alternative recommandée)
```bash
eas build --platform android --profile production
```

### 8. Vérifications post-build

#### 8.1 Analyser le AAB
```bash
# Installer bundletool
brew install bundletool  # macOS
# ou télécharger depuis https://github.com/google/bundletool

# Extraire et analyser
bundletool build-apks --bundle=app-release.aab --output=app.apks --mode=universal
bundletool validate --bundle=app-release.aab
```

#### 8.2 Tester le AAB
- [ ] Installer l'APK universel sur un appareil de test
- [ ] Vérifier que tout fonctionne (ads, Firebase, Supabase, etc.)
- [ ] Vérifier que Crashlytics envoie bien les rapports

### 9. Upload sur Google Play Console

#### 9.1 Préparer les assets du Store
- [ ] Screenshots (minimum 2, recommandé 8)
- [ ] Feature graphic (1024 x 500 px)
- [ ] Icône de l'app (512 x 512 px)
- [ ] Description courte (80 caractères max)
- [ ] Description longue (4000 caractères max)
- [ ] Vidéo promo (optionnel)

#### 9.2 Upload du AAB
- [ ] Se connecter à la Google Play Console
- [ ] Aller dans "Production" → "Créer une nouvelle version"
- [ ] Uploader le fichier `app-release.aab`
- [ ] Remplir les notes de version (changelog)
- [ ] Vérifier les avertissements éventuels
- [ ] Soumettre pour examen

#### 9.3 Configuration du Store Listing
- [ ] Catégorie de l'app
- [ ] Tags / mots-clés
- [ ] Âge requis (PEGI, ESRB)
- [ ] Politique de confidentialité (URL)
- [ ] Coordonnées de support

### 10. Post-publication

#### 10.1 Monitoring
- [ ] Vérifier Firebase Analytics (premiers utilisateurs)
- [ ] Vérifier Crashlytics (aucun crash ?)
- [ ] Vérifier les revenus AdMob
- [ ] Surveiller les avis sur le Play Store

#### 10.2 Marketing
- [ ] Annoncer la sortie sur les réseaux sociaux
- [ ] Envoyer un email aux beta-testeurs
- [ ] Créer un post de lancement

---

## 🚨 Points d'attention critiques

1. **NE JAMAIS PERDRE LE KEYSTORE** : Sans lui, impossible de mettre à jour l'app
2. **Tester le AAB avant publication** : Upload sur "Internal Testing" d'abord
3. **Crashlytics doit être activé SEULEMENT en production**
4. **Vérifier les Ad Unit IDs** : Pas de Test IDs en prod !
5. **Sauvegarder les mots de passe du keystore** dans un gestionnaire de mots de passe

---

## 📚 Ressources utiles

- [Documentation Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Documentation React Native Firebase](https://rnfirebase.io/)
- [Guide Google Play Console](https://support.google.com/googleplay/android-developer/)
- [AdMob Policy Center](https://support.google.com/admob/answer/6128543)
- [Guide bundletool](https://developer.android.com/tools/bundletool)

---

**Date de création** : 2025-11-12
**Dernière mise à jour** : 2025-11-12
**Version** : 1.0.0

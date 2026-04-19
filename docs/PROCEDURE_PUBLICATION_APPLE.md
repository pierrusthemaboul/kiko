# 🍎 Procédure de Publication sur Apple App Store (iOS)

## Vue d'ensemble

Cette procédure détaille les étapes pour compiler et soumettre l'application **Timalaus** sur l'App Store. Apple impose des contraintes strictes sur la confidentialité (Privacy Manifest) et l'interface (SafeArea).

---

## ✅ Prérequis de Compte
1.  **Apple Developer Program** : Compte actif (99$/an).
2.  **App Store Connect** : Fiche application créée avec le bundleIdentifier `com.pierretulle.juno2`.
3.  **EAS CLI** : Connecté au compte Expo.

---

## 🥇 Phase 1 : Conformité iOS (Check-list Critique)

Avant tout build de production, ces points **doivent** être validés sous peine de rejet immédiat.

### 1.1 Confidentialité & Tracking (AdMob)
*   **App Tracking Transparency** : 
    - Vérifier la présence de `expo-tracking-transparency` dans `package.json`.
    - Vérifier que `requestTrackingPermissionsAsync()` est appelé au lancement.
    - Message requis : *"Cette application utilise des données pour vous proposer des publicités personnalisées et améliorer votre expérience de jeu."*
*   **Privacy Manifest** : Le bloc `ios.privacyManifest` doit être présent dans `app.config.js` déclarant l'usage des API (ex: `NSPrivacyAccessedAPICategoryUserDefaults`).

### 1.2 Assets & UI
*   **Icônes sans Transparence** : L'image `./assets/images/oklogo.png` ne doit avoir **aucun canal alpha**.
*   **Audit SafeArea** : Vérifier que les écrans (Index, VueValid, Admin) utilisent `SafeAreaView` ou `useSafeAreaInsets` pour éviter l'encoche (Notch).

### 1.3 Versioning
*   **`buildNumber`** : Doit être incrémenté dans `app.config.js` -> `ios.buildNumber`.
*   **`bundleIdentifier`** : Doit correspondre exactement à celui du portail Apple (`com.pierretulle.juno2`).

---

## 🚀 Phase 2 : Build & Soumission (EAS)

La compilation iOS nécessite un certificat de distribution géré via EAS.

### 🛠️ Étape 1 : Gestion des Certificats
Si c'est la première fois ou en cas d'expiration :
```bash
eas credentials
```
*(Choisir iOS -> Production -> Suivre les instructions pour laisser Expo gérer les certificats).*

### 📦 Étape 2 : Lancement du Build
Nous utilisons le build Cloud pour éviter d'avoir besoin d'un Mac localement :
```bash
eas build --platform ios --profile production
```

### 📤 Étape 3 : Soumission à l'App Store
Une fois le build terminé :
```bash
eas submit --platform ios --latest
```

---

## 🏁 Phase 3 : Validation App Store Connect

1.  **TestFlight** : Une fois soumis, l'IPA apparaît dans TestFlight après ~15min de traitement.
2.  **Conformité à l'exportation** : Répondre "Non" à la question sur le chiffrement (sauf usage spécifique de HTTPS complexe).
3.  **Vérification de la confidentialité** : Remplir la section "Confidentialité de l'App" sur le portail en accord avec le Privacy Manifest.
4.  **Soumission pour examen** : Cliquer sur "Ajouter pour examen" une fois tous les champs remplis.

---

## 🔧 Rappels Techniques iOS

### Privacy Manifest (Exemple `app.config.js`)
```javascript
ios: {
  privacyManifest: {
    NSPrivacyAccessedAPITypes: [
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
        NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
      }
    ]
  }
}
```

### Script de vérification d'icône (Commande utile)
Pour vérifier si l'icône a de la transparence (nécessite ImageMagick) :
```bash
identify -format "%[channels]" assets/images/oklogo.png
```
*(Si le résultat contient 'alpha', l'icône sera rejetée).*

---

**Dernière mise à jour** : 17/04/2026
**Mainteneur** : Pierre / Antigravity

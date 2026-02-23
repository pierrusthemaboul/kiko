# 📦 Procédure de Création de Build (Via GitHub Actions)

Ce document est une instruction stricte pour l'IA lorsqu'un build est demandé.

## 🚀 Priorité : Build de Développement (Default)

**Usage** : C'est le build utilisé 99% du temps pour le développement. Il permet de se connecter au code local via `npx expo start`.

- **Identification** : Se nomme "Timalaus DEV" sur le téléphone.
- **Package ID** : `com.pierretulle.juno2.dev` (Coexiste avec la version Play Store).
- **Commande de lancement** :
  ```bash
  gh workflow run build-apk.yml -f profile=development
  ```
- **Action suivante** : Une fois installé, l'utilisateur doit lancer son serveur :
  ```bash
  adb reverse tcp:8081 tcp:8081 && export EXPO_PUBLIC_DEBUG_LOGS=1 && npx expo start --localhost --clear
  ```

---

## 🏗 Build de Production (APK Autonome)

**Usage** : Uniquement pour test final ou partage. Ne se connecte pas au PC.

- **Identification** : Se nomme "Timalaus" sur le téléphone.
- **Package ID** : `com.pierretulle.juno2` (Identique au Play Store).
- **Commande de lancement** :
  ```bash
  gh workflow run build-apk.yml -f profile=apk
  ```

---

## 🛠 Procédure pour l'IA

1.  **Vérification** : `git push` obligatoire avant de lancer.
2.  **Lancement** : Utiliser le profil **development** par défaut, sauf demande contraire explicite.
3.  **Suivi** : `gh run watch`.
4.  **Téléchargement** : Fournir le lien vers l'artifact `android-apk` sur :
    `https://github.com/pierrusthemaboul/kiko/actions/workflows/build-apk.yml`

---
**Coexistence** : Les deux versions (DEV et PROD) ont des identifiants différents. Elles peuvent être installées simultanément sur le même téléphone sans conflit.

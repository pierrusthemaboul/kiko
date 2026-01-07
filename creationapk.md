# 📦 Procédure de Création d'APK (Via GitHub Actions)

Ce document est une instruction stricte pour l'IA (Antigravity/Claude) lorsqu'un build APK est demandé.

## 🎯 Instructions pour l'IA

Quand l'utilisateur demande "Faire un build", l'IA doit d'abord déterminer le type nécessaire :

### 1. Build de Développement (Development Client)
**Usage** : Pour le debug local, le Fast Refresh, et une connexion avec `npx expo start`.
- **Commande** :
  ```bash
  gh workflow run build-apk.yml -f profile=development
  ```
- **Action suivante** : Une fois installé sur le téléphone, l'utilisateur lancera son serveur local (`adb reverse`, `npx expo start`).

### 2. Build de Production (APK Autonome)
**Usage** : Application finale indépendante, pour test final ou partage.
- **Commande** :
  ```bash
  gh workflow run build-apk.yml -f profile=apk
  ```

## 🛠 Procédure Générale

1.  **Vérification** : S'assurer que les changements récents sont poussés sur GitHub (`git push`).
2.  **Lancement** : Exécuter la commande `gh workflow run` appropriée ci-dessus.
3.  **Suivi** : Surveiller l'avancement avec :
    ```bash
    gh run watch
    ```
4.  **Récupération du lien** : Fournir le lien vers les Artifacts du build (nommé `android-apk`).
    - Le lien est : `https://github.com/pierrusthemaboul/kiko/actions/workflows/build-apk.yml`

---
**Note** : Cette méthode est prioritaire car elle ne consomme pas les ressources de l'ordinateur local.

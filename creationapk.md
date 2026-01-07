# 📦 Procédure de Création d'APK (Via GitHub Actions)

Ce document est une instruction stricte pour l'IA (Antigravity/Claude) lorsqu'un build APK est demandé.

## 🎯 Instructions pour l'IA

Quand l'utilisateur demande de "Faire un build APK" :

1.  **Vérification** : S'assurer que les changements récents sont poussés sur GitHub (`git push`).
2.  **Lancement du Build** : Exécuter la commande GitHub CLI suivante :
    ```bash
    gh workflow run build-apk.yml
    ```
3.  **Suivi** : Surveiller l'avancement avec :
    ```bash
    gh run watch
    ```
4.  **Récupération du lien** : Une fois le build terminé, l'IA doit fournir le lien vers les Artifacts du build sur le dépôt GitHub.
    - Le lien est généralement : `https://github.com/pierrusthemaboul/kiko/actions/workflows/build-apk.yml`
    - L'utilisateur pourra y télécharger le fichier nommé `android-apk`.

---
**Note** : Cette méthode est prioritaire car elle ne consomme pas les ressources de l'ordinateur local.

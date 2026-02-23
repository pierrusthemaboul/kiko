# Solution de vérification TikTok Developer - 25 novembre 2025

## Problème rencontré

TikTok Developer demande de vérifier la propriété d'un site web en uploadant un fichier de vérification. Le problème majeur rencontré :

1. **TikTok génère un nouveau fichier de vérification à CHAQUE tentative**
   - Nom du fichier différent à chaque fois
   - Contenu différent à chaque fois
   - Impossible de préparer le fichier à l'avance

2. **Confusion entre le nom du fichier affiché et le nom du fichier téléchargé**
   - Police de caractères ambiguë (I vs l vs 1, t vs T)
   - Exemple : TikTok affiche `tiktokIXpIQth0dEqcNWKuHVXIaiRUR0ZG4DKt.txt` mais le fichier téléchargé s'appelle `tiktoktXpiQfh0dEqcNWKuHVXIaiRUR0ZG4DK1.txt`

3. **Tentatives infructueuses avec Netlify**
   - Le site kiko-app.netlify.app a été créé mais la vérification échouait
   - Problème de synchronisation entre le fichier uploadé et ce que TikTok cherchait

## Solution qui a fonctionné

### Utilisation de GitHub Pages au lieu de Netlify

**Pourquoi GitHub Pages fonctionne mieux :**
- Déploiement automatique via GitHub Actions
- Meilleure gestion des fichiers statiques
- URL stable : `https://pierrusthemaboul.github.io/kiko/`
- Pas de problème de cache CDN

### Étapes de la solution (25 nov 2025, 2h-3h du matin)

1. **Créer le workflow GitHub Actions**
   ```yaml
   # Fichier : .github/workflows/pages.yml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   jobs:
     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4
         - name: Setup Pages
           uses: actions/configure-pages@v4
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v3
           with:
             path: './public'
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v4
   ```

2. **Copier le fichier TikTok dans public/**
   ```bash
   cp ~/Téléchargements/tiktokoFThPUBeTZQL3xOJOn99icDR8NjlGh5Q.txt public/
   ```

3. **Commit et push**
   ```bash
   git add public/tiktokoFThPUBeTZQL3xOJOn99icDR8NjlGh5Q.txt
   git commit -m "Add TikTok verification file"
   git push origin main
   ```

4. **Activer GitHub Pages**
   - Aller sur https://github.com/pierrusthemaboul/kiko/settings/pages
   - Sous "Source", sélectionner "GitHub Actions"
   - Attendre 30 secondes le déploiement

5. **Vérification TikTok réussie**
   - URL vérifiée : `https://pierrusthemaboul.github.io/kiko/`
   - Fichier accessible : `https://pierrusthemaboul.github.io/kiko/tiktokoFThPUBeTZQL3xOJOn99icDR8NjlGh5Q.txt`
   - Statut : ✅ Verified

## Protocole pour la prochaine fois

### Prompt global à utiliser immédiatement

Quand TikTok demande une vérification de site, utiliser ce prompt en une seule fois :

```
TikTok me demande de vérifier mon site. Voici les autorisations et accès dont tu as besoin :

AUTORISATIONS GLOBALES :
- Accès lecture/écriture à tous les fichiers du projet
- Accès git (commit, push)
- Accès au dossier ~/Téléchargements en lecture
- Déploiement automatique sur GitHub Pages
- Création de workflows GitHub Actions

TÂCHES À FAIRE :
1. Configure GitHub Pages avec workflow automatique si pas déjà fait
2. Attends que je télécharge le fichier de vérification TikTok
3. Dès que je te dis "fichier téléchargé", fais automatiquement :
   - Trouve le dernier fichier tiktok*.txt dans ~/Téléchargements
   - Copie-le dans public/
   - Commit + push sur GitHub
   - Attends 30s le déploiement
   - Vérifie que le fichier est accessible en ligne
   - Donne-moi l'URL à mettre dans TikTok

Ne me pose AUCUNE question, agis directement. Si tu as besoin d'infos, cherche-les dans les fichiers du projet (app.json, build.gradle, etc).
```

### Checklist technique

- [ ] GitHub Pages configuré avec GitHub Actions (pas "Deploy from branch")
- [ ] Workflow `.github/workflows/pages.yml` en place
- [ ] Dossier `public/` contient tous les fichiers statiques
- [ ] Attendre 30 secondes après chaque push pour que GitHub Pages se mette à jour
- [ ] Vérifier l'accessibilité du fichier avec `curl` avant de cliquer sur Verify dans TikTok

### Informations de configuration sauvegardées

**URLs vérifiées :**
- GitHub Pages : `https://pierrusthemaboul.github.io/kiko/` ✅ Verified
- Netlify : `https://kiko-app.netlify.app/` (backup)

**Fichiers importants :**
- Terms of Service : `https://pierrusthemaboul.github.io/kiko/terms.html`
- Privacy Policy : `https://pierrusthemaboul.github.io/kiko/privacy.html`

**Configuration Android (pour référence future) :**
- Package name : `com.pierretulle.juno2`
- Play Store URL : `https://play.google.com/store/apps/details?id=com.pierretulle.juno2`

**Fichiers de vérification TikTok déployés :**
- `tiktokoFThPUBeTZQL3xOJOn99icDR8NjlGh5Q.txt` (utilisé pour la vérification finale réussie)
- `tiktokIXpIQth0dEqcNWKuHVXIaiRUR0ZG4DKt.txt`
- `tiktoktXpiQfh0dEqcNWKuHVXIaiRUR0ZG4DK1.txt`
- `tiktokw7EwcgEjfLYfW6VfmM0NzrDhU7szH53k.txt`

## Statut final

✅ **App TikTok soumise pour review le 25 novembre 2025 à 3h du matin**

En attente de validation par l'équipe TikTok. Vérifier régulièrement le Developer Portal.

## Leçons apprises

1. **GitHub Pages > Netlify** pour les fichiers de vérification statiques
2. **Ne pas perdre de temps à deviner** - télécharger le fichier TikTok et le déployer immédiatement
3. **Automatiser avec GitHub Actions** pour éviter les déploiements manuels
4. **Utiliser curl pour vérifier** que le fichier est bien accessible avant de cliquer sur Verify
5. **Un seul prompt avec toutes les autorisations** pour que l'IA puisse agir de manière autonome

## Script rapide pour les prochaines vérifications

```bash
# À exécuter après avoir téléchargé le fichier TikTok
LATEST_TIKTOK=$(ls -t ~/Téléchargements/tiktok*.txt | head -1)
cp "$LATEST_TIKTOK" public/
git add public/tiktok*.txt
git commit -m "Add TikTok verification file"
git push origin main
sleep 35
FILENAME=$(basename "$LATEST_TIKTOK")
curl -s "https://pierrusthemaboul.github.io/kiko/$FILENAME"
echo "Fichier accessible à : https://pierrusthemaboul.github.io/kiko/$FILENAME"
```

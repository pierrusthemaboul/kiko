# EMMA - Agent de Publication TikTok

EMMA est responsable de la publication automatique des vidéos sur TikTok. Elle utilise Playwright pour automatiser l'interaction avec l'interface de chargement de TikTok.

## Fonctionnement

1. **Scan** : Analyse le dossier `PRET_A_PUBLIER/TIKTOK` pour trouver de nouvelles vidéos.
2. **Extraction** : Extrait la légende (hook) du nom de fichier ou des métadonnées (en cours d'amélioration).
3. **Publication** :
   - Lance un navigateur Chromium.
   - Utilise une session pré-enregistrée (`tiktok_session.json`).
   - Télécharge la vidéo sur `tiktok.com/upload`.
   - Saisit la légende avec hashtags.
   - Clique sur "Publier".
4. **Archivage** : Déplace la vidéo vers `PUBLISHED/TIKTOK/` après succès.

## Installation

```bash
cd K_HIVE/AGENTS/EMMA
npm install
npx playwright install chromium
```

## Configuration Initiale (Session)

Pour que l'agent puisse publier sans demander de mot de passe à chaque fois, vous devez capturer une session active :

1. Lancez le script de configuration :
   ```bash
   node setup_session.js
   ```
2. La fenêtre du navigateur s'ouvre. Connectez-vous manuellement à TikTok.
3. Une fois sur votre profil ou sur la page d'accueil, revenez dans le terminal et appuyez sur **Entrée**.
4. Le fichier `tiktok_session.json` sera créé.

## Utilisation

**Simuler une publication (Dry-run) :**
```bash
node agent.js --dry-run
```

**Publication réelle :**
```bash
node agent.js
```

## Maintenance et Sécurité

- Ne partagez jamais le fichier `tiktok_session.json`, il contient vos identifiants de connexion.
- Si la publication échoue subitement, vérifiez si TikTok a changé son interface ou si votre session a expiré. Relancez `setup_session.js` si nécessaire.
- Respectez les limites de TikTok (paramètre `max_posts_per_run` dans `config.json`).

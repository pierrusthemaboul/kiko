# Guide pour les Agents IA (AI Assistants Guide)

Bienvenue sur le projet Kiko. En tant qu'agent, vous devez respecter ce protocole pour ne pas déstructurer le travail de vos prédécesseurs.

## 🛠️ Où travailler ?
1. **Tests et Scratch** : Créez vos scripts de test dans `/scripts/sandbox/`. Ils sont automatiquement ignorés par Git.
2. **Pipelines** : Si vous modifiez un pipeline, travaillez dans le sous-dossier correspondant dans `/tools/`.
3. **Application Mobile** : Ne modifiez `mobile_app/` **que si le client vous le demande explicitement**.

## 🚀 Commandes Principales (depuis la Racine)
- `npm run ideation` : Lance la génération d'événements.
- `npm run chambre_noire` : Produit les images pour les événements en attente.
- `npm run remote` : Active le contrôle à distance via Supabase.
- `npm start` : Démarre l'application mobile (via relais vers mobile_app).

## ⚠️ Ce qu'il ne faut JAMAIS faire
- **Pas de scripts à la racine** : Ne créez jamais de fichiers `.mjs`, `.js` ou `.py` à la racine du repo.
- **Secrets** : Ne hardcodez jamais de clé API. Utilisez le `.env` dans `/credentials/`.
- **Config** : Ne modifiez pas `package.json` ou `metro.config.js` sans demander une double validation, car cela peut casser la chaîne de build mobile.

## 📁 Ressources Utiles
- Pour comprendre la structure : [PROJET_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- Pour voir l'arbre complet : [PROJET_TREE.md](./PROJECT_TREE.md)
- Pour l'audio (Point Critique) : [AUDIO_MIGRATION_GUIDE.md](./AUDIO_MIGRATION_GUIDE.md)

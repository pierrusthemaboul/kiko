# GEMINI_PERMISSIONS_GUIDE.md

Pour éviter les clics "Accept" répétitifs dans Antigravity, il existe deux mécanismes principaux :

### 1. Utilisation du flag `SafeToAutoRun`
Dans mes outils de commande (`run_command`), je peux régler `SafeToAutoRun` sur `true`. Cependant, Antigravity ne l'honore que si la commande est jugée "vraiment sûre" ou si l'utilisateur a autorisé globalement l'agent à exécuter des commandes dans ce dossier.

### 2. Workflows avec annotation `// turbo` (Recommandé)
C'est la méthode la plus puissante pour autoriser des exécutions automatiques.

**Comment ça marche :**
1. Créer un dossier `.agent/workflows/` à la racine du projet.
2. Créer un fichier `.md` (ex: `build.md`) décrivant les étapes.
3. Ajouter l'annotation `// turbo` au-dessus d'une étape `run_command`.

**Exemple de syntaxe dans un workflow :**
```markdown
---
description: Pipeline de production TikTok
---
1. Nettoyer le dossier output
// turbo
2. Exécuter l'agent CHLOE
```

**Options Turbo :**
- `// turbo` : Autorise l'auto-run pour l'étape suivante uniquement.
- `// turbo-all` : Autorise l'auto-run pour TOUT le fichier workflow.

### 3. Permissions par dossier
Antigravity peut être configuré (côté client/IDE) pour faire confiance à certains chemins. Si vous utilisez VS Code avec l'extension Antigravity, vous pouvez souvent cocher "Always allow for this workspace".

---
*Note : Pour la Mission 8, je vais tenter d'utiliser `SafeToAutoRun: true` pour les commandes de nettoyage et de test.*

# 🧹 Guide du Ménage (Project Cleanup Protocol)

Ce document sert de référence pour maintenir le projet Kiko propre et organisé. Tout agent IA perdue ou l'utilisateur peut demander : *"Fais le ménage en suivant le CLEANUP_GUIDE"* pour remettre de l'ordre.

## 1. La Règle d'Or : Racine Propre (Root Zero)
La racine du projet (`/`) ne doit contenir QUE des dossiers de structure et des fichiers de configuration globaux.
- **INTERDIT** : Fichiers `.js`, `.mjs`, `.py`, `.sql`, `.json` de données, ou `.log` à la racine.
- **ACTION** : Déplacer tout fichier égaré vers le dossier approprié dans `/scripts/` ou `/tools/`.

## 2. Classification des Fichiers Égarés
Lors d'un ménage, suivez cette logique de rangement :
- **Scripts de test/IA** : Déplacer vers `/scripts/sandbox/`.
- **Scripts de correction/audit** : Déplacer vers `/scripts/maintenance/`.
- **Fichiers de données (>1Mo)** : Déplacer vers `/data/` (et s'assurer qu'ils sont ignorés par Git).
- **Fichiers de clés/secrets** : Déplacer vers `/credentials/`.

## 3. Nettoyage des Déchets (Junk Cleaning)
Supprimer systématiquement les fichiers suivants s'ils traînent :
- `dump_*.json`
- `session_*.json`
- `test_*.mjs` (si plus d'utilité immédiate)
- Dossiers `temp_images/` sans utilité.
- Fichiers `.log` ou `report.txt` obsolètes.

## 4. Maintenance Git
- Vérifier que les nouveaux dossiers "lourds" sont bien dans le `.gitignore`.
- S'assurer qu'aucun secret n'est ajouté par erreur dans l'index.

## 5. Validation après Ménage
Après avoir déplacé des fichiers :
1. Mettre à jour les chemins dans le `package.json` racine si nécessaire.
2. Tester une commande critique (ex: `npm start --dry-run`) pour vérifier que la structure mobile est intacte.

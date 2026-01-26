# GEMINI_COSTS_SYSTEM.md

## 10.1 Diagnostic actuel des coûts

1. **APIs utilisées** : J'utilise principalement l'API **Gemini** (pour mon raisonnement et mes réponses) et l'outil **generate_image** (qui utilise DALL-E 3).
2. **Appels payants** : 
   - La génération de l'image `cta_button.png` a utilisé un crédit de génération d'image (DALL-E 3).
   - Mes propres réflexions/tâches consomment des tokens Gemini API.
3. **Méthode de génération** : Les images sont générées via l'outil interne `generate_image`.

## 10.2 Proposition de système de tracking

Je propose de créer un fichier `COSTS_TRACKER.md` à la racine du projet.

**Format proposé :**
| Date | Agent | Action | API | Unité | Coût Est. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-01-17 | CHLOE | Génération CTA | DALL-E 3 | 1 image | $0.04 |
| 2026-01-17 | GEMINI | Mission Phase 2 | Gemini Flash | ~20k tokens | $0.01 |

**Mise à jour automatique :**
Je m'engage à ajouter une ligne à ce tableau après chaque action "lourde" ou génération d'asset.

---
*Voulez-vous que j'initialise ce fichier `COSTS_TRACKER.md` dès maintenant ?*

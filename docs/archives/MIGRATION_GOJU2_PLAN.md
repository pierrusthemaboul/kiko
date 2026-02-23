# Plan de Migration et d'Optimisation : goju2 ➡ evenements

Ce document récapitule la stratégie pour traiter les événements en attente et les intégrer au jeu Kiko Chrono.

## 1. État des Lieux
- **Source** : Table Supabase `goju2` (événements bruts/en attente).
* **Cible** : Table Supabase `evenements` (production).
* **Référentiel Notoriété** : Basé sur `backend-scripts/etape3.md`.

## 2. Étapes du Processus (À venir)

### A. Audit et Nettoyage de `goju2`
- **Détection des doublons sémantiques** : Utilisation de l'IA pour comparer les événements de `goju2` avec ceux de `evenements`. 
  - *Exemple de risque identifié* : "La France organise la Coupe du Monde" vs "La France remporte la Coupe du Monde". Même si les titres diffèrent, sémantiquement, ils peuvent saturer le jeu sur le même sujet le même jour.
  - **Solution** : Pour chaque date identique (ou proche), l'IA déterminera si les événements sont "redondants" ou "complémentaires".
- **Vérification technique** : Format de date ISO, IDs uniques.
- **Filtrage de collision** : Exclusion automatique des IDs déjà présents dans la table de production.

### B. Attribution de la Notoriété (IA-Assisted)
L'IA proposera un score entre 0 et 100 en suivant strictement la grille historique de l'utilisateur :
- **95-100** : Symboles nationaux universels.
- **80-94** : Repères scolaires massifs (D-Day, Louis XIV).
- **60-79** : Culture générale classique.
- **40-59** : Public cultivé.
- **20-39** : Niche ou international.
- **0-19** : Obscur.

### C. Enrichissement des Données
- Validation/Génération de `types_evenement` (Array).
- Vérification du champ `pays` (pour l'onboarding).
- Vérification de la `description_detaillee`.

### D. Phase de Transfert
- Script sécurisé d'injection par lots (batch).
- Initialisation de `frequency_score` à 0.
- Mise à jour automatique du cache de l'application.

## 3. Instructions Particulières de l'Utilisateur
- *[En attente de vos nouvelles instructions...]*

---
*Dernière mise à jour : 27/01/2026*

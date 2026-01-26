# 🎮 Gameplay Mechanics : "Avant ou Après" (Mode Classique)

> **Document de Référence K-Hive**
> Ce document définit la vérité sur le fonctionnement du jeu (React Native).
> Tous les agents doivent baser leur communication sur ce mode binaire.

---

## 1. Concept Global
Jeu de **quiz chronologique mobile** basé sur un choix binaire simple. Le joueur doit décider si un nouvel événement a eu lieu **avant** ou **après** un événement de référence affiché à l'écran.

## 2. La Mécanique (Core Loop)

### A. Interface de Jeu (Mobile First)
*   **Haut de l'écran** : Barre de progression (nombre d'événements validés / objectif du niveau).
*   **Centre de l'écran** : **L'Événement de Référence**. Une carte avec son nom, son illustration et sa date (ex: "Van Gogh - 1889").
*   **Milieu/Bas** : **La Carte Cible**. Le nouvel événement qui apparaît (ex: "Première greffe cardiaque"), mais **sans sa date**.
*   **Bas de l'écran (Zone Tactile)** : Deux grands boutons conçus pour les pouces :
    *   ⬅️ **Bouton GAUCHE : "AVANT"**
    *   ➡️ **Bouton DROIT : "APRÈS"**

### B. Le Choix et la Validation
1.  Le joueur appuie sur "AVANT" ou "APRÈS".
2.  **Révélation instantanée** : La carte cible bascule (flip animation) pour révéler sa date réelle.
3.  **Si Correct (Victoire du tour)** :
    *   Animation de montée : La carte cible glisse vers le haut.
    *   **Nouvel Ancrage** : Elle remplace l'ancienne carte de référence et devient la référence pour le prochain tour.
4.  **Si Incorrect** :
    *   Feedback visuel d'erreur.
    *   Conséquence selon le mode (perte de vie ou reset).

## 3. Dynamique et Progression
*   **Enchaînement rapide** : Le jeu est conçu pour être fluide et rapide. Chaque bonne réponse change immédiatement le point de comparaison.
*   **Structure par Niveaux** : Un niveau est validé après une série de succès (ex: "Valider 6 événements d'affilée").

## 4. Aspect Éducatif
À la fin du niveau, le joueur peut consulter le détail de la frise qu'il vient de parcourir :
*   **Lecture approfondie** : Clic sur une carte pour ouvrir un court texte explicatif (ex: le détail sur Christiaan Barnard).

## 5. Conséquences pour l'IA Marketing
*   **Louis (Stratégie)** : Doit mettre en avant l'accessibilité "1 main / 1 pouce" et le côté addictif du "Perfect Streak".
*   **Léa (Créa)** : Doit produire des visuels montrant les gros boutons "AVANT / APRÈS" pour que l'interface React Native soit immédiatement reconnaissable.
*   **Hugo (Social)** : Doit créer des sondages binaire sur les réseaux (Story Instagram/TikTok) qui miment exactement le gameplay du jeu.

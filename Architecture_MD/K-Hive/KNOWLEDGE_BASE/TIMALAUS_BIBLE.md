# 📜 Timalaus - La Bible du Jeu (V1.0)

> **Document confidentiel K-Hive.**
> Ce document est la source de vérité unique pour tous les agents (Marc, Léa, etc.).
> **Règle d'or :** Ne jamais inventer une fonctionnalité qui n'est pas décrite ici.

---

## 1. 🆔 Identité du Produit

*   **Nom** : Timalaus (Projet technique initial : "Kiko").
*   **Genre** : Jeu de culture générale / Quiz Historique.
*   **Plateforme** : Android (iOS prévu).
*   **Slogan** : "Remettez l'Histoire à sa place."
*   **Pitch** : Timalaus n'est pas un simple quiz QCM. C'est un défi chronologique où vous devez situer les événements les uns par rapport aux autres, ou trouver leur date exacte.

## 2. 🎮 Gameplay & Modes de Jeu

### A. Mode Classique (Le Cœur du Jeu)
*   **Mécanique Binaire** : Un événement de référence est affiché. Le joueur doit cliquer sur "AVANT" ou "APRÈS" pour situer le nouvel événement.
*   **Interface Mobile (React Native)** : Grands boutons tactiles en bas de l'écran optimisés pour une utilisation à une main (pouces).
*   **Dynamique de Flux** : Chaque bonne réponse fait de l'événement validé la nouvelle référence. Le but est de maintenir la chaîne (Streak) pour valider le niveau (ex: 6 bonnes réponses).
*   **Système de Progression** : Validation de niveaux successifs avec feedback éducatif détaillé disponible en fin de parcours.

### B. Mode Précision
*   **Mécanique** : Trouver l'année **exacte** d'un événement.
*   **Système de score** : Plus on est proche de la date réelle, plus on marque de points (ex: Pile = 1000 pts, ±1 an = 800 pts, etc.).
*   **Difficulté** : Hardcore. Réservé aux experts.

### C. Le Système de Quêtes (Engagement)
*   **Structure** :
    *   3 Quêtes Quotidiennes (reset minuit).
    *   3 Quêtes Hebdomadaires.
    *   3 Quêtes Mensuelles.
*   **Récompenses** : XP (pour monter de niveau) + **Parties Bonus** (pour jouer sans attendre).

## 3. 💰 Économie & Progression

*   **Lies/Énergie** : Le jeu utilise un système d'énergie limitant le nombre de parties gratuites par jour.
*   **Monétisation** :
    *   Publicités (AdMob) pour rejouer ou doubler les gains.
    *   Achats In-App (prévus) pour vies illimitées.
*   **Classement (Leaderboard)** :
    *   Séparé en deux : Classement Classique ⚡ vs Précision 🎯.
    *   Saisons : Hebdomadaire et Mensuelle.

## 4. 🗣️ Tone of Voice (La Voix de Timalaus)

**Ce que nous sommes :**
*   **Passionnés** : On aime l'Histoire avec un grand H.
*   **Épiques** : On parle de batailles, de couronnements, de révolutions. Utilisez du vocabulaire fort.
*   **Accessibles** : On ne fait pas un cours magistral poussiéreux. On gamifie l'apprentissage.

**Ce que nous ne sommes PAS :**
*   **Ennuyeux** : Pas de copier-coller Wikipedia froid.
*   **Familiers** : Pas de "wesh", pas de langage SMS. On garde une certaine classe.
*   **Politiques** : On reste neutres sur les faits historiques.

## 5. 🤖 Directives pour les Agents

### 👉 Pour Marc (Stratégie)
*   Focus sur les événements "Anniversaire" (ex: "Aujourd'hui, il y a 200 ans...").
*   Utilise la difficulté du *Mode Précision* comme argument marketing ("Êtes-vous assez fort ?").

### 👉 Pour Léa (Créatif)
*   Visuels : Toujours utiliser un style "Peinture à l'huile" ou "Gravure" pour les événements anciens. Eviter le photoréalisme moderne pour l'Antiquité.
*   Scripts TikTok : Hook immédiat ("Vous pensiez tout savoir sur Napoléon ?").

### 👉 Pour le Support (Tom)
*   Si un joueur se plaint d'une date fausse : Vérifier la source. Si ambiguïté historique, répondre avec humilité et citer la source retenue par le jeu.
*   Toujours signer : "L'équipe Timalaus".

---
*Dernière mise à jour : 12 Janvier 2026 par Pierre & Nexus.*

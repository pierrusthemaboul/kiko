# 📜 STANDARD D'ARCHITECTURE : AGENTS EXÉCUTIFS (V0.1)

## 1. OBJET

Ce document définit la norme de construction des agents au sein d'une Entreprise Virtuelle. Il vise à éliminer les "Agents Décoratifs" (jeu de rôle textuel) au profit des "Agents Exécutifs" (programmes autonomes).

## 2. DÉFINITION : "VRAI AGENT" VS "FAUX AGENT"

| Caractéristique | AGENT DÉCORATIF (SIMULATION) | AGENT EXÉCUTIF (ACTION) |
| :--- | :--- | :--- |
| **Interface** | Fenêtre de Chat. | Ligne de commande / Script. |
| **Donnée** | Inventées par l'IA (Hallucination). | Lues dans des fichiers ou via API. |
| **Output** | Du texte pour l'utilisateur. | Des fichiers créés ou modifiés (.json, .md). |
| **Échec** | L'IA dit qu'elle a fait le travail. | Le script renvoie une erreur système. |

## 3. LES 4 PILIERS DE L'ARCHITECTURE (OBLIGATOIRE)

Toute création d'agent doit comporter ces quatre composants pour être considérée comme "Réelle" :

### A. Le Manifeste ([NOM]_AGENT.md)
Ce n'est pas un texte de théâtre, c'est une spécification technique.
*   **Rôle** : Mission précise et limites de décision.
*   **Capabilities** : Liste des fonctions que l'agent est autorisé à appeler.
*   **Workflow** : Schéma logique (Si [Condition] Alors [Action]).

### B. Le Moteur (agent.js ou agent.py)
Le code qui fait le pont entre l'IA et le système.
*   **Fonction** : Doit charger le Manifeste, injecter les données réelles et exécuter la réponse de l'IA.
*   **Structure** : Lecture MD -> Appel LLM -> Exécution Commande -> Écriture Log.

### C. La Configuration (config.json)
Les paramètres de l'environnement.
*   **Contenu** : Chemins des dossiers (/data, /logs), modèles d'IA utilisés, clés API, variables d'environnement.

### D. La Mémoire de Travail (/STORAGE)
L'agent doit posséder son propre espace de fichiers.
*   **Input** : Fichiers de données à analyser.
*   **Output** : Fichiers générés par l'agent.
*   **Logs** : Historique technique de chaque décision prise.

## 4. INSTRUCTIONS DE CONCEPTION POUR L'IA

Lorsqu'une IA génère un agent, elle doit respecter ces règles de construction :
1.  **Interdiction du flou** : Ne jamais utiliser de termes comme "Gérer" ou "Optimiser" sans définir l'outil technique associé (ex: update_file()).
2.  **Séparation des pouvoirs** : Le texte (MD) définit la stratégie, le code (JS/PY) gère l'exécution.
3.  **Vérifiabilité** : Chaque action doit laisser une trace dans un fichier log. Si l'action n'est pas traçable, elle n'est pas exécutée.
4.  **Boucle de Feedback** : L'agent doit vérifier le résultat de son action (ex: après avoir écrit un fichier, il doit vérifier qu'il existe).

## 5. TEST DE CONFORMITÉ

Un agent est valide si, et seulement si, il peut être lancé par la commande suivante sans intervention humaine :
node [NOM]_agent.js (ou équivalent Python).

---
*Document de référence - Méta-Spécification pour Entreprises Virtuelles*

# 🛡️ Agent Videur (Bouncer Agent)

## Rôle
L'Agent Videur est le gardien de la table `evenements`. Aucun événement ne doit entrer dans la table principale sans avoir été validé par cet agent.

## Processus de Validation
L'agent récupère les événements candidats dans la table `antichambre` et effectue les vérifications suivantes :

1.  **Vérification de la Date** : 
    *   Comparaison avec **Wikidata**.
    *   Analyse de cohérence par **Gemini Flash**.
    *   Cross-check avec **Wikipedia**.
2.  **Doublons Sémantiques** : Vérification qu'un événement identique n'existe pas déjà (même sous un titre différent).
3.  **Cohérence Interne** : Vérification que la `description_detaillee`, le `titre` et la `date` sont parfaitement alignés.
4.  **Qualité Globale** : Respect des standards de l'application (langue, format, etc.).

## Table Antichambre
La table `antichambre` sert de zone de transit (SAS). Elle possède exactement la même structure que la table `evenements`.

## Utilisation
```bash
npm run start
```

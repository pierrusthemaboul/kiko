# 🎯 Critères de Sélection des Événements ("Choix des Événements")

Ce document définit les règles de sélection pour la machine à événements. L'objectif est de garantir que chaque carte du jeu Kiko est historiquement incontestable et facile à placer sur une chronologie.

## 1. La Règle de l'Année Unique (Punctuabilité)

**Instruction Critique :** Tout événement sélectionné doit pouvoir être daté par une **année précise**. 

*   **REJETER** : Les plages d'années (ex: 1337-1453), les siècles (ex: "Le Siècle des Lumières"), ou les mouvements artistiques globaux (ex: "La Renaissance").
*   **PRIVILÉGIER** : Les "événements-points" (sacre, traité, bataille, découverte, mort, fondation, parution d'un livre).

### Exemples de Transformation (Workflow de la Machine)

| Type d'erreur | Sujet trop large (REJETÉ) | Événement Précis (VALIDÉ) | Année Pivot |
| :--- | :--- | :--- | :--- |
| **Guerre** | La Guerre de Cent Ans | Bataille de Castillon | 1453 |
| **Règne** | Le règne de Louis XIV | Mort de Mazarin (début du règne personnel) | 1661 |
| **Science** | L'invention de l'imprimerie | Impression de la Bible de Gutenberg | 1455 |
| **Droit** | La réhabilitation de Jeanne d'Arc | Verdict du procès en nullité | 1456 |
| **Exploration**| La découverte de l'Amérique | Arrivée de Colomb à San Salvador | 1492 |

## 2. Gestion du Consensus et Point de Bascule

Si un fait historique s'étale dans le temps, la machine doit identifier l'**année de bascule** ou l'**acte fondateur**.

*   **Pour une construction** : Choisir l'année de la pose de la première pierre ou, mieux, l'année de la consécration/inauguration.
*   **Pour un personnage** : Ne pas utiliser "Vie de Charlemagne", utiliser "Sacre de Charlemagne".
*   **Pour une loi/traité** : Utiliser l'année de la signature ou de la promulgation.

## 3. Évitement des Doublons Sémantiques

La machine doit systématiquement comparer les nouveaux candidats avec la table `evenements`. 
*   Si le sens est identique (ex: "Chute de la Bastille" vs "Prise de la Bastille"), elle doit **fusionner** les entrées sur l'année du consensus (1789).

## 4. Règle du Titre Intemporel
*   **Pas de dates dans le titre** : Le titre ne doit **jamais** contenir l'année ou une date précise (ex: "Bataille de Castillon" et non "Bataille de Castillon 1453"). 
*   **Pourquoi ?** : La date est une donnée à part dans la base de données. L'inclure dans le titre crée une redondance visuelle et casse l'immersion sur les cartes.

## 5. Règle de Spécificité (Le "Test de Louis XIV")
*   **Identifiabilité immédiate** : Le titre doit permettre d'identifier précisément l'événement sans ambiguïté.
*   **REJETER** : Les titres trop poétiques ou vagues (ex: "Résonances d'un scandale", "Mort d'un grand roi").
*   **PRIVILÉGIER** : Les noms propres, les lieux précis et les actions claires (ex: "L'Affaire Stavisky", "Mort de Louis XIV"). Le joueur doit savoir exactement de quoi on parle sans avoir besoin de la date.

## 6. Règle de l'Événement Pivot Unique
*   **Éviter la fragmentation** : Pour un sujet complexe (ex: une guerre, une affaire judiciaire), ne pas créer plusieurs cartes pour des sous-étapes techniques ou obscures.
*   **Atomicité** : Privilégier un seul événement "majeur" qui englobe le sujet (le début, l'acte fondateur ou le dénouement). 
*   **REJETER** : Les étapes intermédiaires peu connues du grand public (ex: "La communication de pièces secrètes dans l'Affaire Dreyfus").
*   **PRIVILÉGIER** : L'événement qui a le plus d'impact dans la mémoire collective (ex: "Début de l'Affaire Dreyfus" ou "J'accuse de Zola").

## 7. Pipeline de Génération (Spécifications Techniques)

Chaque événement validé par la machine doit être inséré dans la table Supabase `queue_sevent` avec la structure suivante :

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `titre` | text | Titre propre (Test de Louis XIV validé). |
| `year` | integer | Année unique (ex: 1789). |
| `type` | text | Catégorie (Bataille, Politique, Science, etc.). |
| `region` | text | Pays ou zone géographique. |
| `description` | text | Description détaillée pour l'enrichissement visuel. |
| `status` | text | Toujours `'pending'` par défaut. |
| `notoriete` | integer | Score de 1 à 100 (importance historique). |

### Règle d'Enrichissement Visuel (Prompting)
Pour aider `sevent3.mjs` à générer une image parfaite, la colonne `description` doit favoriser les termes concrets :
- **Matériaux** : marbre, fer forgé, parchemins, lin, bois brut.
- **Ambiance** : lumière rasante, clair-obscur, brouillard matinal.
- **Action** : signature à la plume, charge de cavalerie, foule en liesse.

---
*Dernière mise à jour : 29/01/2026*

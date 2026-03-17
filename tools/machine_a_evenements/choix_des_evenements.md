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
*   **Longueur maximale** : Le titre doit être **TRÈS COURT (Maximum 50 caractères)**. 
    *   **REJETER** : "La Révolution culturelle en Chine, période de bouleversements sociaux et politiques..." (Trop long).
    *   **PRIVILÉGIER** : "La Révolution culturelle en Chine" (Concise).
*   **Pourquoi ?** : La date est une donnée à part dans la base de données. L'inclure dans le titre crée une redondance visuelle et casse l'immersion sur les cartes. Les titres longs surchargent l'interface.

## 5. Règle de Spécificité (Le "Test de Louis XIV")
*   **Identifiabilité immédiate** : Le titre doit permettre d'identifier précisément l'événement sans ambiguïté.
*   **REJETER** : Les titres trop poétiques ou vagues (ex: "Résonances d'un scandale", "Mort d'un grand roi").
*   **PRIVILÉGIER** : Les noms propres, les lieux précis et les actions claires (ex: "L'Affaire Stavisky", "Mort de Louis XIV"). Le joueur doit savoir exactement de quoi on parle sans avoir besoin de la date.

### 5.1 La Règle de Distinction (Anti-Homonymie)
Certains noms d'événements sont récurrents dans l'histoire (ex: "Siège de Constantinople", "Bataille de Poitiers", "Traité de Paris", "Sac de Rome").
*   **INTERDICTION** : Il est interdit d'utiliser ces noms "nus" s'ils désignent plusieurs faits historiques majeurs.
*   **QUALIFICATION OBLIGATOIRE** : Tu **DOIS** ajouter un qualificatif (protagoniste ou contexte) entre parenthèses pour lever l'ambiguïté.
*   **EXEMPLES** :
    *   ❌ "Siège de Constantinople" (1422) -> ✅ "Siège de Constantinople (Mourad II)"
    *   ❌ "Bataille de Poitiers" (1356) -> ✅ "Bataille de Poitiers (Jean le Bon)"
    *   ❌ "Sac de Rome" (1527) -> ✅ "Sac de Rome (Charles Quint)"
    *   ❌ "Paix de Paris" (1763) -> ✅ "Traité de Paris (Guerre de Sept Ans)"

**Note :** Si l'événement est le SEUL vraiment célèbre portant ce nom (ex: "Bataille de Waterloo"), la qualification n'est pas nécessaire, mais la prudence est de mise.

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
- **Sobriété** : Éviter les foules ou l'héroïsme systématique si le sujet est paisible ou intellectuel. Une scène peut être puissante par son calme.

## 8. Stratégie d'Ancrage Temporel (Anti-Anachronismes)

Flux-Schnell ne gère pas les "Negative Prompts". Pour éviter les anachronismes (ex: casquettes de 1940 au XIXe siècle), il faut **ancrer** la scène par des descriptions positives incompatibles avec le moderne.

### 💂‍♂️ Uniformes et Couvre-chefs
*   **Avant 1914** : Toujours spécifier `"kepi"`, `"shako"`, `"bicorne"`, `"tricorne"`, `"red beret"` (pour les carlistes) ou `"shaggy fur hat"`. 
    *   *Note* : Interdire implicitement les casquettes plates modernes (peaked caps) en ancrant sur le shako/kepi rigide.
*   **XV-XVIIIe** : Préciser `"felt hats"`, `"tricornes"`, `"powdered wigs"`.

### ⛵ Maritime et Transport
*   **Avant 1850** : Toujours spécifier `"wooden sailing ship"`, `"three-masted ship"`, `"rigging"`, `"canvas sails"`.
*   **1850-1890** : Préciser `"early paddle steamer"`, `"black funnel with thick soot"`, `"iron hull"`.
*   **Avant 1880** : Préciser `"horse-drawn carriage"`, `"wooden stagecoach"`, `"dirt road with wagon ruts"`.

### 📸 Médium et Texture (Le "Verrou Visuel")
*   **XIXe Siècle** : Ancrer sur le médium `"collodion wet plate photography"`, `"daguerreotype style"`, `"heavy paper grain"`, `"sepia tones"`.
*   **Général** : Toujours forcer des textures de tissus `"coarse wool"`, `"slubby linen"`, `"heavy velvet"`. Des visages `"weathered skin"`, `"asymmetric features"`.

## 9. Gestion des Événements de "Mort" ou de "Violence"

Pour garantir une expérience de jeu premium et éviter le contenu macabre ou choquant :

*   **Dignité Royale/Personnelle** : Pour un décès (ex: "Mort de Louis XIV"), la description ne doit **JAMAIS** se concentrer sur le cadavre ou l'agonie. 
*   **Focus à privilégier** : 
    *   L'héritage (le personnage dans son atelier ou à son apogée).
    *   Le deuil national (foule recueillie, bannières en berne).
    *   L'atmosphère (chambre de palais sombre, bougies, silence solennel).
*   **Interdiction formelle** : Ne mentionner aucun terme tel que "corps", "cadavre", "sang", "blessure" ou "visage déformé". La scène doit être une célébration historique ou une révérence, jamais une scène d'horreur.

---
*Dernière mise à jour : 08/02/2026*

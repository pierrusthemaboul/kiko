# 🚀 Stratégie de Migration & Audit : Goju2 -> Evenements

Ce document sert de guide de passation pour la migration des données historiques du projet Kiko. L'objectif est de passer de la table de travail `goju2` à la table de production propre `evenements`, tout en garantissant une qualité historique et visuelle parfaite.

## 1. Phase d'Audit des Anachronismes (Vision)
Avant la migration, chaque image doit être validée pour éviter les erreurs temporelles (ex: Tour Eiffel en 1740).

### Méthode recommandée
- **Outil** : Utiliser un script Node.js (`audit_goju2_images.js`) ou une analyse directe par l'IA.
- **Points de contrôle** :
    - **Objets** : Pas de plastique, lunettes modernes, électricité, smartphones.
    - **Architecture** : Cohérence avec l'année (ex: pas de béton moderne avant le XXe).
    - **Vêtements** : Coupes de cheveux et tissus d'époque (tolérance ±25 ans).
    - **Texte** : Rejet systématique si l'année ou le titre est écrit sur l'image.
- **Action** : 
    - Score > 8 : Migration autorisée.
    - Score < 7 : Demander à `sevent3.mjs` de regénérer l'image avec un prompt "Positive Descriptive" (focus sur les matériaux : bois, fer, pierre, lin).

## 2. Détection des Doublons Sémantiques
Le système actuel détecte les doublons par mots-clés, mais pas par sens.

### Procédure "Meta-Auditeur"
1. Extraire les titres de `evenements`.
2. Comparer les nouveaux candidats de `goju2` via une IA pour détecter les doublons sémantiques.
    - *Exemple* : "Le sacre de Napoléon" et "Bonaparte devient Empereur" sont le même événement.
3. Ne migrer que les événements apportant une réelle valeur ajoutée ou un angle différent.

## 3. Paramètres de Migration Technique et Enrichissement IA
Lors de l'insertion dans la table `evenements`, la machine doit enrichir les données dynamiquement :
- **Consensus Historique** : Si la date de `goju2` est imprécise ou erronée, l'IA doit chercher le consensus (ex: verdict de 1456 pour Jeanne d'Arc) et corriger l'année.
- **`noting_score`** : Attribuer un score de 1 à 100 basé sur l'importance historique mondiale/nationale.
- **`niveau_difficulte`** : Définir si l'événement est Facile, Moyen ou Difficile pour un joueur moyen.
- **Géolocalisation** : Déduire `universel` (boolean), `pays` et `region` à partir du titre et du contexte.
- **Formatage** : 
    - `date` : Toujours `YYYY-01-01`.
    - `date_formatee` : L'année en texte (ex: "1456").
- **Traçabilité** : Remplir `migration_at` (now) et `source_goju2_id`.
- **`is_played`** : Initialisé à `false`.
- **`style_info`** : Conserver le JSON du style utilisé.

## 4. Gestion des Images et Fusions
- En cas de doublons sémantiques ou de plusieurs entrées pour le même sujet, l'IA choisit l'image qui illustre le mieux le **consensus historique**.
- Marquer les entrées non retenues de `goju2` comme `transferred` avec un flag ou commentaire `duplicate`.

## 4. Instructions pour la prochaine session
"Bonjour, je souhaite reprendre la migration de la table `goju2` vers `evenements`.
1. Lis le fichier `MIGRATION_STRATEGY.md`.
2. Analyse les 10 plus récents événements de `goju2` (id, titre, date, image).
3. Donne ton audit historique sur ces images.
4. Propose un plan pour migrer ceux qui sont validés."

---
*Document généré par Antigravity le 27/01/2026*

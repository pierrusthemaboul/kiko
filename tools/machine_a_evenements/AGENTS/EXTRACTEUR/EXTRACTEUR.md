---
description: "Comment utiliser l'Extracteur Wikidata (Filon d'Or)"
---
# L'Agent EXTRACTEUR

L'Extracteur est le "Foreur à Diamants" de Kiko. Il a pour but d'extraire des événements extrêmement célèbres d'une thématique spécifique pour boucher les trous de la base de données.

## Fonctionnement

Le USER ne doit **jamais** manipuler les requêtes techniques. Il va simplement te dire :
> "Je veux 30 pépites sur les Guerres Mondiales" ou "Donne-moi 50 inventions du quotidien."

**C'est à TOI (l'Agent IA) de faire la traduction technique :**
1. Tu dois déduire le(s) code(s) Wikidata correspondants (ex: `wd:Q362` pour Guerre mondiale, `wd:Q1120503` pour Inventions). Si tu ne les connais pas, fais une recherche rapide sur Wikidata.
2. Tu dois déduire un paramètre logique de notoriété (`--sitelinks`). Règle générale :
## Stratégie de Découverte (La Carte 3D)

Si le USER te demande de "trouver des événements pour améliorer le jeu sans thème précis" en se basant sur la **Carte 3D (PCA)** :
1. Analyse le fichier HTML de la carte 3D générée (`carte_embeddings_3d.html`) ou base-toi sur tes connaissances des "trous noirs" habituels dans les jeux d'histoire classiques (ex: Histoire des continents africain et asiatique, ères précolombiennes, histoire des sciences, histoire des femmes).
2. Déduis un thème manquant pertinent (ex: "Empereurs de Chine", "Découvertes Scientifiques", "Histoire de l'Afrique subsaharienne").
3. Lance l'extracteur avec les paramètres adéquats pour combler ce vide !

## Options du script `extracteur.mjs`

Le script s'execute en ligne de commande :
\`\`\`bash
node tools/machine_a_evenements/AGENTS/EXTRACTEUR/extracteur.mjs --target <nb> --theme "<Nom du Thème>" --q <wd:Q...> --sitelinks <nb> [--start <année>] [--end <année>] [--date_prop <wdt:...>]
\`\`\`

*   `--target` : Nombre d'événements validés à obtenir (ex: 30)
*   `--theme` : Nom lisible du thème pour le terminal (ex: "Batailles du Moyen-Âge")
*   `--q` : Identifiant de la classe Wikidata (ex: `wd:Q178561`). On peut utiliser `/wdt:P279*` automatiquement dans le code pour chercher dans les sous-classes.
*   `--sitelinks` : Filtre impitoyable de popularité, nombre de traductions minimal (ex: 40)
*   `--start` / `--end` (Options) : Pour limiter à une période temporelle (ex: `--start 500 --end 1500`).
*   `--date_prop` (Option) : Propriété de date à utiliser (`wdt:P585` ponctuel, `wdt:P571` création, `wdt:P577` publication). Par défaut: P571.

## Format de Sortie
Le script écrira le résultat final dédoublonné et certifié "Point de Bascule" dans :
`c:/Users/Pierre/kiko/acquisition_ext.json`

Ensuite, propose au USER de basculer ce JSON vers l'Agent ARTISAN pour le traitement des images et l'insertion en base centrale.

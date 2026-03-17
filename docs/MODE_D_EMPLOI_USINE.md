# 🏭 L'Usine à Événements Timalaus - Manuel d'Utilisation
*Ce document résume le fonctionnement de la chaîne d'acquisition (Pipeline "Zéro Hallucination") mise en place pour extraire des pépites historiques de Wikipedia, les vérifier et les envoyer vers le jeu.*

---

## 🏗️ 1. L'Architecture Globale (Le Sas de Décontamination)

Pour protéger la base de production (`evenements`) des erreurs d'IA, des mythes ou des anomalies temporelles, tout nouvel événement doit passer par **3 étapes** :

1.  **L'Extracteur Wikipedia** 🚜 : Il lit des pages entières de Wikipédia (sources sûres) et extrait les "Aha Moments" historiques ou populaires. Il les dépose dans la **table `sas`** (statut `A_HABILLER`).
2.  **L'Agent VERITAS** ⚖️ : Il agit comme un Correcteur / Juge. Il lit les événements du Sas en attente, les confronte strictement aux lois de `rules_evenements.md`, nettoie le titre et change le statut en `VALIDE`.
3.  *(Plus tard)* **Les Agents Artisan & Portier** 🎨 : Ils prendront les événements `VALIDE` pour dessiner les cartes et les migrer vers la table finale du jeu.

---

## 🚜 2. Utiliser l'Extracteur Wikipedia (`extracteur_wiki.mjs`)

Cet outil ne brainstorme pas : il **lit** des listes Wikipedia et extrait leur substantifique moelle. Il intègre un **double bouclier anti-doublon** (scan sur base principale + scan sur Sas) grâce aux *Embeddings* vectoriels.

### 💻 Commande d'Extraction Manuelle (1 page à la fois) :
Ouvrez le terminal à la racine `kiko` et tapez :
```bash
node tmp/extracteur_wiki.mjs --page "Titre_Exact_de_la_Page_Wiki" --theme "Le_Nom_De_La_Categorie" --target 30
```

---

## 🏭 2.5 Utiliser l'Orchestrateur Industriel (Mode Automatique Nuit)

Au lieu de lancer les pages, une par une, l'usine dispose d'un automate (`orchestrateur_wiki.mjs`) qui peut moissonner 80 pages d'affilée en gérant ses quotas de manière autonome.

### 💻 Commande d'exécution :
Ouvrez le terminal à la racine `kiko` et tapez :
```bash
node orchestrateur_wiki.mjs
```

### 🧠 Fonctionnement de l'Orchestrateur :
1. Il lit le fichier manifeste `plan_de_moisson.json` (ou `plan_emissions.json` si vous modifiez le code interne). Le manifeste contient la liste des pages Wikipedia cibles, le thème et le volume attendu.
2. L'Orchestrateur démarre un **Extracteur** pour la ligne 1, en surveillant son avancement.
3. À la fin de la page, il fait une pause respiratoire de 10 secondes pour préserver les quotas API Google/Wikipédia.
4. Il passe à la page suivante et affiche une magnifique **Barre de Progression** dans le terminal.
5. Idéal à lancer avant d'aller se coucher pour réveiller un Sas rempli de centaines de pépites.

---

## ⚖️ 3. Utiliser l'Agent Qualité VERITAS V2 (L'Investigateur)

Une fois que l'Extracteur a rempli le `sas`, ces événements sont à l'état "brut" (`A_HABILLER`). 
Il faut lâcher l'Agent de la propreté (VERITAS V2) pour **enquêter** (Recherche Wikipédia autonome) et **désambiguïser** les titres obscurs (ex: *"Drames judiciaires"* devient *"Livre Drames Judiciaires de Charles Dupressoir"*).

### 💻 Commande d'exécution :
Ouvrez le terminal à la racine `kiko` et tapez :
```bash
node machine_a_evenements/AGENTS/VERITAS/agent.js
```

### 🧠 Ce que fait VERITAS V2 (Investigateur) :
1. Il charge et lit votre fichier `rules_evenements.md`.
2. Pour chaque événement du `sas`, **il appelle l'API Wiki** pour chercher la vérité absolue de la page (Auteur, Nature du fait).
3. Il vérifie s'il ne s'agit pas d'un mythe morbide.
4. Il ré-écrit le titre de façon millimétrée avec ce nouveau contexte, sans date ni article défini en début.
5. Il met à jour la ligne Supabase en statut `VALIDE`.

---

## 💡 4. Rappel sur la table `sas` (Supabase)

La table `sas` contient une colonne `embedding` native qui est renseignée dès l'insertion par le Moissonneur. C'est ce qui garantit qu'on n'insérera jamais deux fois le même événement même s'il n'est pas encore migré dans la table principale.

*   Si un événement ne passe pas les critères de VERITAS, il passe en statut `REFUZE_VERITAS` (avec l'explication du rejet dans sa description).
*   L'objectif quotidien du Game Designer est d'avoir une liste propre d'événements `VALIDE` dans ce sas avant de passer à l'étape des illustrations.

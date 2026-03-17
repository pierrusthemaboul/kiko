# 📜 Charte Éditoriale et Technique de la Machine Kiko

Ce document rassemble l'ensemble des règles de fer pour la création, la validation et l'illustration des événements du projet Kiko. Il doit être respecté par tous les agents (Genesis, Rivière, Peintre, Sentinel).

---

## 1. Sélection Historique (La Règle d'Or)
### 1.1 Punctuabilité (L'Année Unique)
Chaque événement doit être datable par une **année précise unique**.
- **REJETER LES ANNÉES NÉGATIVES** : Aucun événement avant l'an zéro (Avant J.-C. interdit). Le jeu ne gère que les dates positives historiques.
- **REJETER** : Plages de dates (ex: 1337-1453), siècles, mouvements globaux ("Renaissance").
- **PRIVILÉGIER** : L'acte fondateur, le "point de bascule" ou le dénouement (Sacre, Traité, Mort, Découverte).
- **Consensus** : En cas de doute, utiliser la date du consensus historique (ex: 1456 pour Jeanne d'Arc).

### 1.2 Le "Test de Louis XIV" (Identifiabilité)
Le titre doit permettre d'identifier précisément l'événement sans ambiguïté.
- **REJETER** : Titres poétiques ou vagues ("Mort d'un grand roi", "Un jour de gloire").
- **PRIVILÉGIER** : Noms propres, lieux et actions claires ("Mort de Louis XIV", "Bataille de Castillon").

### 1.3 Atomicité et Fragmentation
Éviter de créer 10 cartes pour le même sujet technique. Choisir l'événement pivot qui a le plus d'impact dans la mémoire collective.

---

## 2. Titrage et Formatage
### 2.1 Règle du Titre "Nu" et Impactant
- **Zéro Date** : Ne jamais inclure l'année dans le titre (ex: INTERDIT "Prise de la Bastille (1789)").
- **Clarté avant Longueur** : Le titre doit être concis mais la priorité absolue est que le joueur puisse l'identifier clairement sans ambiguïté ("Déchiffrement des hiéroglyphes par Champollion").
- **Le Nom Culturel, pas la Description (RÈGLE FATALE)** : Ne jamais utiliser de descriptions administratives ennuyeuses (ex: "Recensement des propriétés en Angleterre"). Utiliser le nom historique **Célèbre** (ex: "Achèvement du Domesday Book").
- **Pas de "Processus Flous"** : Bannir les mots mous comme *"Succès de"*, *"Diffusion de"*, *"Limitation de"*. Remplacer par l'acte fondateur net *"Sortie officielle de Minecraft"*, *"Installation de la première imprimerie à Rome"*.

### 2.2 Gestion des Homonymes
Si un nom d'événement désigne plusieurs faits célèbres (ex: "Bataille de Poitiers"), on lève l'ambiguïté avec des parenthèses :
- `Bataille de Poitiers (Jean le Bon)`
- `Bataille de Poitiers (Charles Martel)`

### 2.3 Métadonnées Obligatoires
Chaque événement doit posséder :
- **Universel** : Boolean (Impact mondial vs local).
- **Région / Pays** : Zones géographiques précises.
- **Époque** : Antiquité, Moyen Âge, Renaissance, XVIIe, XVIIIe, XIXe, XXe, Contemporain.
- **Notoriété** : Score de 0 à 100 (importance historique réelle).
- **Niveau de difficulté** : 1 (Facile), 2 (Moyen), 3 (Difficile).

---

## 3. Illustration (Agent Peintre)
### 3.1 Style "Kiko"
- **Format** : Toujours 16:9 (1024x576).
- **Esthétique** : Minimaliste, impact fort, "blank solid background", couleurs vibrantes, haut contraste.
- **Médium** : Selon l'époque (Gravure, 35mm photograph, Daguerréotype, Peinture).

### 3.2 Interdictions Formelles
- **Zéro Texte** : Aucun lettrage ou chiffre lisible sur l'image (cause de rejet immédiat).
- **Zéro Propriété Intellectuelle** : Pas de visages célèbres protégés, logos ou personnages de fiction identifiables (Utiliser des métaphores visuelles).
- **Zéro Macabre** : Pour les morts célèbres, ne jamais montrer de cadavre, sang ou agonie. Se concentrer sur l'héritage, le deuil ou la solennité.

### 3.3 Anti-Anachronismes (Ancrage Positif)
Comme l'IA ne gère pas les "Negative Prompts", on utilise des descriptions positives pour verrouiller l'époque :
- **Avant 1914** : Spécifier "kepi", "shako", "tricorne" ou "perruque poudrée".
- **Maritime** : "Vaisseau en bois", "gréement", "voiles de lin".
- **Texture** : "Laine grossière", "papier épais grainé", "daguerrotype".

---

## 4. Intégrité de la Base (Embeddings)
### 4.1 Déduplication Sémantique
Chaque nouvel événement doit être passé au crible des **embeddings Texte**.
- "Chute de l'URSS" et "Dissolution du bloc soviétique" sont sémantiquement identiques et doivent être fusionnés.

### 4.2 Diversité Visuelle
L'index d'**embeddings Image** garantit que la base de production (actuellement 2721 événements) ne contient pas d'illustrations redondantes esthétiquement.

---
*Dernière mise à jour : 08/03/2026*

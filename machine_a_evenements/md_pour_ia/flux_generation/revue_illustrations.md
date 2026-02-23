# Revue des Illustrations Historiques

Ce document sert à analyser les illustrations générées par le pipeline afin d'affiner la précision historique et la qualité visuelle.

## Méthodologie
1. **Analyse unitaire** : Nous discutons d'une image spécifique.
2. **Identification** : Nous séparons ce qui est réussi de ce qui doit être corrigé.
3. **Mise à jour du système** : Les conclusions sont directement intégrées dans le code (`sevent3.mjs`) ou les prompts système de Gemini.

---

## Guide de Style Actuel
- **Mode** : Réalisme Historique (Photographique/Cinématique)
- **Modèle** : Flux-Dev (20 steps)
- **Moteur de Prompt** : Gemini 2.0 Flash
- **Contraintes** : Zéro objet moderne, précision des couleurs de faction.

#### 13. Fondation de l'abbaye de Fleury (651) - [VERSION 2 - APRÈS DIRECTIVES]
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Architecture Cohérente (VICTOIRE) :** C'est une réussite majeure. On est sortis du biais de la "ville en pierre du XVe siècle". Les bâtiments sont en bois avec des toits de chaume ou de bardeaux, ce qui est parfaitement représentatif de l'époque mérovingienne (VIIe siècle).
    - **Ambiance :** L'aspect "communauté naissante" dans une clairière boisée respecte bien le contexte historique.
    - **Infrastructure :** Pas de bitume, pas de câbles. La route est un simple chemin de terre.
    - **Vêtements :** Les robes sont simples, sans le look "hoodie" moderne.

- **Points Faibles (MINEURS) :**
    - **Action :** On reste sur une scène un peu statique. On aurait pu voir plus de travail de construction actif (des moines avec des haches ou défrichant).
    - **Coiffures :** De dos, c'est difficile à dire, mais les coupes semblent encore un peu trop "propres".

- **Note :** Cette image montre que les directives sur l'architecture et les matériaux (bois/chaume pour le haut moyen âge) sont cruciales pour sortir l'IA de ses clichés médiévaux tardifs.

#### 14. Début de la construction du château de Pierrefonds (1397)
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Le Chantier (RÈGLE N°2 & 4) :** On voit un vrai chantier ! Des fondations creusées, des blocs de pierre empilés, des chemins de terre battue. C'est très vivant.
    - **Zéro Anachronisme :** Aucun grue moderne, aucun échafaudage en métal, aucun camion. La règle "Industrial" et "Anti-Modernity" a bien tenu.
    - **Toits (RÈGLE N°3) :** Bien que l'ardoise bleue soit là, on voit aussi des tuiles rouges, ce qui est cohérent pour le mélange des styles seigneuriaux du XIVe.
    - **Transport :** L'utilisation de bœufs et de charrettes simples est excellente pour le réalisme historique.

- **Points Faibles (MINEURS) :**
    - **L'Anachronisme Architectural (Le syndrome Viollet-le-Duc) :** L'arrière-plan montre déjà un château fini qui ressemble beaucoup au Pierrefonds "restauré" par Viollet-le-Duc au XIXe siècle. Pour 1397, on devrait être dans un style plus sobre. Mais l'IA a probablement été influencée par les photos réelles du château actuel.
    - **L'échelle :** Les fondations au premier plan semblent un peu trop "géométriques" et parfaites, presque comme du béton banché, mais ça passe pour de la pierre de taille.

- **Note :** C'est une image de très haute qualité qui illustre parfaitement l'effort de construction. La mise en application des règles sur l'infrastructure (chemins de terre) transforme radicalement le réalisme de la scène.

#### 15. Abolition de l'esclavage dans les colonies françaises (1848)
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Architecture (RÈGLE N°3) :** Le bâtiment de style classique avec ses colonnes est très crédible pour une institution parisienne de 1848. Les toits en ardoise sont bien là.
    - **Infrastructure (RÈGLE N°4) :** Le sol mouillé avec des reflets et de la boue/pavés est excellent. Aucune trace de bitume moderne.
    - **Éclairage :** L'ambiance "becs de gaz" de l'époque est très bien rendue.
    - **Costumes :** Les silhouettes avec hauts-de-forme et redingotes sont conformes à la période.

- **Points Faibles (MINEURS) :**
    - **Manque de Spécificité :** L'image est un peu "générique". On voit une foule devant un bâtiment officiel, mais rien ne dit visuellement qu'il s'agit de l'abolition de l'esclavage. Il manque un symbole fort (une affiche, Schœlcher, ou une représentation plus diverse de la foule).
    - **Composition :** Les personnages au premier plan nous tournent le dos, ce qui renforce l'aspect "spectateur" mais diminue l'impact émotionnel du sujet.

- **Note :** Techniquement, c'est un sans-faute sur les règles historiques (pas d'anachronismes). Pour ce type d'événement politique, on devra forcer Gemini à inclure des "visual cues" (indices visuels) plus explicites sur le thème traité.

#### 17. Louis XI crée les postes royales (1464)
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Zéro Anachronisme :** Aucun objet moderne. L'éclairage aux bougies et les fenêtres gothiques sont cohérents.
    - **Costumes :** L'utilisation de manteaux lourds avec des cols de fourrure évoque bien la fin du XVe siècle et le rang des personnages.
    - **Papeterie :** Le parchemin long (scrol) est crédible pour un édit royal.

- **Points Faibles (MINEURS) :**
    - **Coiffures (RÉSISTANCE) :** Le personnage debout a une coupe de cheveux très "2024" (boucles volumineuses sur le dessus, côtés plus courts). On sent que l'IA a du mal à lâcher ses modèles de mode contemporaine.
    - **Manque de Narration :** C'est la création de la POSTE. On aurait adoré voir un cavalier prêt à partir, un sac de courrier, ou une carte du royaume sur la table. Ici, c'est juste "deux hommes qui regardent un papier".
    - **Identité de Louis XI :** Le roi est représenté comme un jeune homme assez beau gosse. Louis XI à cette époque était connu pour être plus âgé, physiquement assez ingrat, et portant souvent un chapeau iconique avec des médailles pieuses.

- **Note :** La machine est désormais "sûre" (plus d'erreurs bêtes), mais elle reste dans une zone de confort "théâtrale". Pour une confiance totale, il manque encore ce petit grain de sel historique qui rend l'image unique au lieu d'être un simple tableau de "hommes en costume".

#### 16. Mariage d'Aliénor d'Aquitaine et Henri Plantagenêt (1152)
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Ambiance :** L'éclairage aux chandelles est très réussi, créant une atmosphère de cérémonie intime et solennelle.
    - **Textures :** Les tissus en laine et lin ont un rendu brut et authentique, loin des synthétiques modernes.
    - **Zéro Anachronisme Majeur :** Pas d'objets modernes visibles.

- **Points Faibles (MINEURS) :**
    - **Le Biais de la Table (RÈGLE N°1) :** C'est flagrant ici. Un mariage royal au XIIe siècle se fait devant un autel, debout. Ici, ils sont encore une fois rassemblés autour d'une table, comme s'ils signaient un contrat de bail.
    - **Coiffures Modernes (RÈGLE N°5) :** L'homme au premier plan à droite a une coupe de cheveux de 2024. Le "roi" Henri a également une coupe très contemporaine.
    - **Manque de Prestige (RÈGLE N°6 & 9) :** On parle du mariage le plus puissant de l'époque. Ils ressemblent à des paysans aisés. Il manque les soies, les broderies d'or, les bijoux massifs et surtout les **symboles héraldiques** (blasons, lys, léopards).
    - **Robes "Hoodie" :** On retrouve cet aspect de capuches volumineuses qui rappellent un peu trop les vêtements de sport modernes.

- **Note :** L'image est "propre" techniquement, mais elle manque de la majesté associée à la royauté. C'est le plus grand défi pour l'IA : différencier une "scène historique" d'une "scène historique ROYALE".

---

## 🛠️ Directives de Précision Historique (Synthèse)
*Ces règles seront injectées dans le moteur Gemini pour corriger les biais récurrents.*

### 1. Règle de l'Action & Posture
- **Biais IA :** Tendance à mettre tout le monde assis à des tables.
- **Directive :** Pour les événements politiques ou sociaux (manifestations, serments, débats), forcer des **postures actives** : debout, bras levés, gestuelle expressive, densité de foule. Supprimer les tables et nappes sauf si explicitement requis.

### 2. Règle de l'Accessoire (Scribe & Quotidien)
- **Biais IA :** Stylos modernes, montres, lunettes contemporaines.
- **Directive :** Avant 1850, bannir le mot "pen". Forcer systématiquement **"goose quills"** (plumes) et **"stone/horn inkwells"** (encriers). Pour les lunettes, forcer **"wire-rimmed spectacles"** ou bannir si non nécessaire.

### 3. Règle du "Climat & Toits" (France/Europe)
- **Biais IA :** Look "Désert" (pierre jaune, toits plats).
- **Directive :** Pour le nord de l'Europe (notamment la France), forcer systématiquement **"steep blue slate roofs"** (ardoise bleue) ou **"red clay tile roofs"**. Préciser **"temperate European climate"** et **"overcast or soft sunlight"** pour éviter l'aspect aride.

### 4. Règle de l'Infrastructure (Voies & Routes)
- **Biais IA :** Routes trop lisses (aspect goudron), rails trop parfaits.
- **Directive :** Avant 1900, exiger des **"muddy rutted tracks"** (chemins de terre avec ornières) et éviter les surfaces parfaitement planes. Pour les premiers trains, demander des rails **"primitive iron rails"** et des locomotives **"spindly and frail"**.

### 5. Règle du Textile & Cheveux
- **Biais IA :** Looks hipsters, tissus type polaire/synthétique, coupes de cheveux contemporaines (dégradés, coupes courtes modernes).
- **Directive :** Forcer les textures **"rough woolen fabric"**, **"linen"**, **"velvet"**. Bannir absolument les coupes de cheveux modernes au profit de **"period-appropriate hairstyles"** (long hair for men in Renaissance/Middle Ages, powder wigs for 18th century, etc.).

### 6. Règle de l'Identité Symbolique (Factions)
- **Biais IA :** Scènes génériques sans signes distinctifs (ressemble à n'importe quel pays).
- **Directive :** Pour la royauté française, forcer systématiquement les symboles : **"Fleur-de-lis motifs"**, **"Royal blue and gold color palette"**. Éviter les foules monochromes (ex: tous en rouge) qui font "fanatiques" ou "clergé".

### 7. Règle de Cohérence de l'Équipement (Guerre & Technologie)
- **Biais IA :** "Soupe" temporelle. L'IA mélange l'Antiquité et le Moyen Âge (ex: des chevaliers en armure de plaques pour Alésia).
- **Directive :** Avant l'an 1000, bannir **"plate armor"** (armures de plates) et les **"heraldic banners"** (blasons). Forcer **"chainmail"** (cotte de mailles), **"bronze/iron helmets"**, **"large rectangular or oval wooden shields"**. Bannir les **"stirrups"** (étriers) pour toute période avant l'an 500.

### 8. Règle de l'Infrastructure Moderne (MAJEUR)
- **Biais IA :** Infiltration d'objets du XXIe siècle (câbles, enseignes lumineuses, poteaux).
- **Directive :** Pour TOUT événement avant 1900, bannir absolument : **"power lines"**, **"overhead cables"**, **"neon signs"**, **"electric lamp posts"**, **"asphalt roads"**. Inspecter scrupuleusement le ciel et les façades pour éliminer tout fil électrique ou équipement moderne.

### 9. Règle de l'Architecture Industrielle vs Décorative
- **Biais IA :** Tendance à transformer les halls d'exposition industriels en "grands magasins" ou en boutiques de luxe avec boiseries sombres.
- **Directive :** Pour l'architecture industrielle (XIXe siècle), forcer **"exposed iron and steel structural beams"**, **"massive glass roofs (verrières)"**. Supprimer les boiseries et les vitrines décoratives sauf si explicitement requis. Les machines doivent être **"massive industrial equipment"** (dynamos, turbines, engrenages géants) et non des petits objets de musée.

---

## Log des Revues

### [DISCUSSION EN COURS]

#### 9. Inauguration de la Galerie des Machines (1889)
- **Points Forts (À GARDER) :**
    - **Perspective :** La sensation de profondeur et la hauteur sous plafond sont impressionnantes.
    - **Fidélité des Costumes :** La foule de hauts-de-forme noirs est très représentative.
    - **Éclairage :** La lumière diffusée par la verrière est superbe.

- **Points Faibles (À CORRIGER) :**
    - **Erreur de Style Architectural (MAJEUR) :** On dirait un grand magasin de luxe (boiseries sombres, vitrines). La Galerie des Machines était un exploit d'ingénierie métallique avec des arches de fer rivetées nues.
    - **Absence de Machines :** On ne voit pas de machines industrielles massives, juste des vitrines.
    - **Matériaux :** Trop de bois, pas assez d'acier/fer de l'époque Tour Eiffel.

- **Piste d'Amélioration pour Gemini :**
    - Préciser les matériaux : **"Exposed iron and steel structural beams, riveted metal arches"**.
    - Décrire les objets : **"Massive industrial steam engines, giant electrical dynamos"**.
    - Éviter le look commercial : **"Industrial exhibition hall, no wooden display cases"**.

#### 8. Sac de Lyon par les Sarrasins (725)
- **Points Forts (À GARDER) :**
    - **Ambiance :** Le rendu du brasier et de la fumée est superbe. L'effet de contre-jour avec les silhouettes donne une tension réelle.

- **Points Faibles (À CORRIGER) :**
    - **Anachronismes Absurdes (CÂBLES & ENSEIGNES) :** Regardez bien en haut : il y a des **fils électriques** ou des câbles qui traversent la rue ! Sur la droite, on aperçoit même ce qui ressemble à une **enseigne de magasin moderne** ou un voyant lumineux. C'est l'échec le plus total du pipeline.
    - **Architecture (MAJEUR) :** Les maisons ressemblent à des immeubles de ville du XVIIIe ou XIXe siècle. En 725, Lyon aurait une architecture gallo-romaine déclinante ou des maisons en bois/torchis très simples.
    - **Équipement Militaire :** Encore une fois, on a des chevaliers en **armure de plaques complète** (1500 ans en avance). Les Sarrasins et les Francs de 725 portaient des tuniques, des cottes de mailles simples et des turbans ou des casques ronds. 

- **Piste d'Amélioration pour Gemini :**
    - Bannir les objets modernes : **"NO power lines, NO electric cables, NO modern shop signs"**.
    - Préciser l'époque architecturale : **"Early medieval architecture, mix of late Roman stone ruins and simple wooden houses"**.
    - Préciser l'ethnie et l'équipement : **"Saracen warriors with turbans, curved swords, and light armor. Frankish defenders in simple mail"**.

#### 12. Translation des reliques de Saint Martin à Tours (561)
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Toits (Règle n°3) :** On voit clairement des **toits en ardoise bleue** (blue slate roofs). C'est une grande victoire sur le biais "pierre jaune/désert". On sent bien le climat de la Touraine.
    - **Route (Règle n°4) :** La route est boueuse, pleine d'ornières (muddy, rutted). Adieu le bitume.
    - **Zéro Anachronisme Majeur :** Pas de câbles électriques, pas d'objets du XXIe siècle.

- **Points Faibles (RÉSISTANCE DE L'IA) :**
    - **Architecture (Anachronisme de 800 ans) :** Bien que les toits soient bleus, le style des maisons est celui du **XVe siècle** (colombages cachés, fenêtres à cadres de pierre, alignement urbain). En 561 (époque mérovingienne), Tours était une ville gallo-romaine survivante ou des constructions en bois très basses.
    - **Éclairage Public :** Les torches sur les façades ont un design qui rappelle trop les lampadaires à gaz du XIXe siècle.
    - **Reliquaire :** Il est très beau mais son style est très "néo-gothique" ou Renaissance tardive. En 561, on attendrait un coffret en bois ou métal très simple, massif.
    - **Costumes :** Les personnages de dos ont des sortes de protections d'épaules qui font un peu "Cinéma/Fantasy".

- **Note :** Le système de règles a transformé une image qui aurait pu être "un désert avec des moines" en une vraie scène européenne crédible pour le grand public. Le combat continue sur la précision de l'époque exacte (ne pas tout ramener au XVe siècle).

#### 8bis. Sac de Lyon par les Sarrasins (725) - [VERSION 2 - APRÈS DIRECTIVES]
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Zéro Objet Moderne :** Plus aucun câble électrique, plus d'enseignes lumineuses. La règle n°8 est validée.
    - **Équipement Militaire :** Les soldats ne sont plus en armure de plaques du XVe siècle. On voit des tuniques, des lances et des protections plus simples. La règle n°7 est validée.
    - **Infrastructure :** On est bien sur un sol en terre/sable, pas de bitume.

- **Points Faibles (À AFFINER) :**
    - **Biais Architectural Persistant :** Bien que ce ne soit plus le XVIIIe siècle, l'architecture reste très "Moyen Âge tardif" (XIVe-XVe) avec ces toits pointus et ces fenêtres bien formées. Pour l'an 725, on devrait tendre vers du "Haut Moyen Âge" (murs plus massifs, style gallo-romain résiduel, moins de verticalité).
    - **Identité du Vaisseau :** Le bateau ressemble à un drakkar viking. Les Sarrasins utilisaient des navires méditerranéens différents (voiles latines).

- **Note :** L'amélioration est spectaculaire par rapport à la V1. L'image est maintenant "utilisable" même si elle n'est pas 100% historiquement rigoureuse sur l'architecture.

#### 10. Édit de Compiègne (1557)
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Accessoires (Règle n°2) :** On voit clairement des **plumes d'oie** (quills) sur la table. Plus de stylos modernes.
    - **Texture (Règle n°5) :** Le rendu de la laine brute des vêtements est excellent.
    - **Ambiance :** L'éclairage aux bougies est très réaliste et donne une atmosphère de "complot" ou de travail législatif intense.

- **Points Faibles (À CORRIGER) :**
    - **Biais "Médiéval" vs Renaissance :** L'événement date de 1557 (Pleine Renaissance, Henri II). Pourtant, l'image ressemble à une scène du **XIIe siècle**. Les robes de moines et la salle austère en pierre ignorent totalement le style de la cour de France au XVIe siècle (velours, cols montants, chapeaux à plume, luxe de la Renaissance).
    - **Biais de la Table (Règle n°1) :** Encore et toujours, l'IA rassemble tout le monde autour d'une table assise. Un Édit de cette importance pourrait être représenté par un crieur public ou une signature royale solennelle debout.
    - **Manque d'Identité (Règle n°6) :** Aucun symbole de la royauté française (Lys, Couronne, Couleurs).

- **Piste d'Amélioration pour Gemini :**
    - Préciser la période : **"16th century French Renaissance style, NOT medieval"**.
    - Forcer les costumes de cour : **"Nobles in silk and velvet doublets, ruff collars, period hats"**.
    - Augmenter la solennité : **"A royal clerk reading a scroll to a standing crowd"**.

#### 11. Fondation de l'ordre des Dominicains (1215)
- **Points Forts (À GARDER) :**
    - **L'ambiance lumineuse :** Le clair-obscur à la bougie fonctionne toujours très bien pour l'aspect "sacré" ou "intellectuel".
    - **Qualité technique :** Très belle image, nette, textures crédibles au premier abord.

- **Points Faibles (À CORRIGER) :**
    - **Coiffures et Barbes Modernes (MAJEUR) :** C'est le plus gros problème ici. Les hommes ont des coupes de cheveux de 2024 (côtés courts, dégradés, barbes parfaitement taillées à la tondeuse). On dirait des acteurs qui viennent de sortir de leur loge. Il manque les **tonsuras** (couronnes de cheveux) typiques des moines.
    - **Le Look "Hoodie" :** Les bures monastiques ressemblent trop à des sweats à capuche (hoodies) modernes en coton. La règle n°5 ("rough woolen fabric") doit être encore plus forcée.
    - **La Table (Règle n°1) :** Toujours la réunion "comité d'entreprise" autour d'une table. Pour une fondation d'ordre, on pourrait imaginer Dominique prêchant debout ou le groupe en prière.

- **Piste d'Amélioration pour Gemini :**
    - Préciser la coiffure religieuse : **"Clerical tonsures, shaved crown of the head"**.
    - Insister sur la texture : **"Very coarse, itchy, authentic brown wool with visible weaving"**.
    - Sortir du biais de la table : **"Saint Dominic standing and preaching to his first followers, passionate gestures"**.

#### 7. Défaite de Vercingétorix à Alésia (-52)
- **Points Forts (À GARDER) :**
    - **Souffle Épique :** L'échelle de la bataille, le chaos, la poussière et les débris sont saisissants.
    - **Composition :** La dynamique du premier plan avec les décombres donne une vraie profondeur.

- **Points Faibles (À CORRIGER) :**
    - **Anachronisme Total (Équipement) :** C'est sans doute le plus gros échec historique ici. Les soldats portent des armures qui ressemblent à celles du **XVe siècle** (plates, casques fermés type salade ou armet). En -52, on devrait voir des cotes de mailles, des boucliers longs et des casques gaulois/romains en bronze ou fer. 
    - **Symboles Médiévaux :** Les bannières au loin ressemblent à des drapeaux de chevaliers médiévaux. Il manque les **Aigles romaines** (Aquila) et les enseignes celtes.
    - **Typologie des Guerriers :** On ne distingue absolument pas qui est Romain et qui est Gaulois. Tout le monde est fondu dans un look "Fantasy Médiévale".

- **Piste d'Amélioration pour Gemini :**
    - Préciser l'équipement : **"Roman legionaries in lorica hamata (chainmail) with scutum (rectangular shields)"**.
    - Préciser les adversaires : **"Gallic warriors with long hair, moustaches, and oval shields"**.
    - Forcer les symboles de l'Antiquité : **"Roman SPQR Aquila standards"**.
    - Bannir les technologies futures : **"No plate armor, no medieval flags, no stirrups"**.

#### 6. Début du règne de François Ier (1515)
- **Points Forts (À GARDER) :**
    - **Solennité :** L'éclairage et la profondeur de champ donnent un aspect "Sacre" très puissant.
    - **Qualité Visuelle :** Très beau rendu cinématographique.

- **Points Faibles (À CORRIGER) :**
    - **Erreur symbolique (MAJEUR) :** On dirait une assemblée de cardinaux ou une cérémonie papale. Il n'y a **aucun signe de la royauté française** (pas de bleu, pas de fleurs de lys, pas de couronne distinctive). Le roi ressemble à un prêtre de dos.
    - **Coiffures Modernes :** Les hommes au premier plan (de dos) ont des coupes de cheveux **ultra-modernes** (courts de type "fade" ou dégradé actuel). C'est un anachronisme flagrant.
    - **Monochromie :** Tout le monde est en rouge vif, ce qui manque de réalisme historique pour une cour de la Renaissance où les soies et les velours étaient plus variés.

- **Piste d'Amélioration pour Gemini :**
    - Forcer l'iconographie : **"French Royal regalia: blue mantle embroidered with golden fleur-de-lis"**.
    - Préciser la coiffure : **"Longer hair or period hats (bonnets), no modern short haircuts"**.
    - Diversifier la foule : **"Nobles in varied silk and velvet costumes (crimson, blue, green, gold)"**.

#### 1. La Fuite à Varennes (1791)
- **Points Forts (À GARDER) :**
    - **Ambiance Lumineuse :** Le rendu nocturne et le clair-obscur sont excellents. L'atmosphère de "clandestinité" est bien rendue.
    - **Qualité Technique :** Netteté parfaite, aucune bouillie visuelle sur les chevaux ou les roues.
    - **Zéro Anachronisme Majeur :** Pas d'objets modernes visibles.

- **Points Faibles (À CORRIGER) :**
    - **Fidélité Historique (Véhicule) :** La berline royale était historiquement imposante et de couleur **jaune et verte** (ou noire). Ici, elle est trop sombre et ressemble à une diligence générique.
    - **La Lanterne :** La lumière semble trop "électrique" ou fixe. Une lanterne de 1791 devrait avoir une flamme plus vacillante et une structure en métal/verre plus marquée.
    - **Le Sol :** La route semble un peu trop lisse (presque comme du bitume moderne). En 1791, on attendrait des ornières plus marquées ou une route de terre/pavés plus brute.
    - **Détails des Personnages :** On ne distingue pas assez le style des vêtements (redingotes, tricornes ou chapeaux de l'époque).

- **Piste d'Amélioration pour Gemini :**
    - Préciser la couleur spécifique du véhicule (ex: "Yellow and green royal berline").
    - Demander des "muddy rutted roads" pour éviter l'effet bitume.
    - Insister sur le "flickering oil lamp" ou "torchlight".

#### 2. Fondation de la Sorbonne (1257)
- **Points Forts (À GARDER) :**
    - **Éclairage Magique :** Les rais de lumière ("god rays") traversant la fenêtre créent une ambiance solennelle et intellectuelle parfaite.
    - **Rendu des Textures :** Le parchemin et le bois de la table sont très crédibles.
    - **Réalisme des Visages :** Les expressions sont sérieuses et humaines.

- **Points Faibles (À CORRIGER) :**
    - **Anachronisme Majeur (Stylos) :** L'homme à droite semble tenir un **stylo moderne** ou un marqueur. Au XIIIe siècle, on utilise exclusivement des **plumes d'oie** (quills).
    - **Vêtements Indéfinis :** Les hauts rouges ressemblent trop à des pulls ou des polaires contemporaines. Il manque l'aspect "habit monastique" ou "tunique médiévale" en laine brute.
    - **Coiffures Modernes :** Les barbes et coupes de cheveux font trop XXIe siècle.

- **Piste d'Amélioration pour Gemini :**
    - Forcer l'utilisation de **"goose quills"** et **"inkwells"**.
    - Décrire des **"woolen monastic habits"** ou **"hooded tunics"**.
    - Préciser **"tonsured hair"** pour les moines/érudits de l'époque.

#### 3. Début de la construction du château de Versailles (1661)
- **Points Forts (À GARDER) :**
    - **Échelle et Gigantisme :** L'impression de foule et de chantier colossal est très bien rendue.
    - **Atmosphère :** La poussière, la lumière rasante et le mouvement donnent vie à la scène.

- **Points Faibles (À CORRIGER) :**
    - **Erreur de Style Architectural (MAJEUR) :** On dirait une cité antique (Égypte, Rome) ou une forteresse du Moyen-Orient. Versailles en 1661, c'est le style Louis XIII : **brique rouge**, **pierre blanche** et surtout de grands **toits d'ardoise bleue en pente**. Ici, les toits sont plats et les bâtiments sont en blocs de pierre jaune "désert".
    - **Anachronisme des Vêtements :** Les ouvriers ressemblent à des paysans bibliques ou romains avec des tuniques courtes et des sortes de toges. En 1661, on porte des **chemises en lin**, des **culottes** (s'arrêtant au genou) et des **bas**.
    - **Le Climat :** L'image fait très "aride", on ne ressent pas du tout le climat de l'Île-de-France.

- **Piste d'Amélioration pour Gemini :**
    - Préciser les matériaux : **"red brick and white limestone walls"**.
    - Forcer les toits : **"slanted blue slate roofs"**.
    - Décrire le style : **"French Classical architecture"**.
    - Préciser la tenue : **"17th-century French laborers in linen shirts and breeches"**.

#### 4. Serment du Jeu de Paume (1789)
- **Points Forts (À GARDER) :**
    - **Composition Dramatique :** L'éclairage central et la symétrie donnent une force incroyable à la scène.
    - **Gravité du Moment :** Le silence et la solennité se ressentent physiquement.
    - **Espace :** Le volume de la salle est bien rendu.

- **Points Faibles (À CORRIGER) :**
    - **Action Erronée (MAJEUR) :** Le Serment du Jeu de Paume est une scène d'**exaltation collective** où tout le monde est debout, les bras levés pour prêter serment. Ici, tout le monde est assis calmement à des tables, on dirait un dîner diplomatique ou une Cène.
    - **Décor Inadapté :** La salle du Jeu de Paume était un gymnase (court de tennis ancestral). Il n'y avait pas de longues tables avec des nappes blanches. C'est un contresens historique total sur la spontanéité du moment.
    - **Vêtements Monocromes :** Tout le monde est en noir/sombre. On perd le contraste entre le Tiers-État (sombre), le Clergé (soutanes) et la Noblesse (soieries).
    - **Anachronisme du Mobilier :** Les tables et les chaises font un peu trop "XIXe siècle" ou même salle de conférence moderne.

- **Piste d'Amélioration pour Gemini :**
    - Forcer la posture : **"Crowd of men standing, raising their right arms in a collective oath"**.
    - Préciser le lieu : **"Inside a high-walled indoor tennis court (Jeu de Paume), bare walls, high windows"**.
    - Supprimer le mobilier : **"No tables, no tablecloths, people are standing in a dense crowd"**.
    - Diversifier les tenues : **"Contrast between black suits of the Third Estate and clerical habits"**.

#### 5. Inauguration du chemin de fer Paris-Saint-Germain (1837)
- **Points Forts (À GARDER) :**
    - **Costumes :** Les hauts-de-forme (top hats) et les redingotes sont parfaits pour l'élite de 1837.
    - **Netteté :** La qualité de l'image est excellente, les textures de bois et de métal sont crédibles.

- **Points Faibles (À CORRIGER) :**
    - **Locomotive Anachronique (MAJEUR) :** La locomotive est beaucoup trop massive et moderne. En 1837, les machines sont beaucoup plus "frêles" (type *Marc Seguin* ou *Rocket*), avec de très grandes roues apparentes et une chaudière fine. Ici, on dirait une locomotive de 1900 ou 1920.
    - **Voies Ferrées :** Le "ballast" (les cailloux) et les rails ont un aspect trop moderne et industriellement parfait.
    - **Manque de "Cérémonie" :** C'est une inauguration, mais on dirait juste des gens qui attendent sur un quai. Il manque les drapeaux, les fleurs sur la locomotive, ou une foule enthousiaste sur le quai pour marquer l'aspect festif.

- **Piste d'Amélioration pour Gemini :**
    - Préciser le modèle de train : **"Early 1830s steam locomotive, spindly design, large exposed thin wheels"**.
    - Ajouter l'aspect festif : **"Inauguration ceremony, festive flags, cheering crowd on the platform, banners"**.
    - Préciser les wagons : **"Early stagecoach-style wooden railway carriages"**.

#### 5bis. Inauguration du chemin de fer Paris-Saint-Germain (1837) - [VERSION 2 - APRÈS DIRECTIVES]
- **Points Forts (SUCCÈS DES RÈGLES) :**
    - **Cérémonie :** On voit des drapeaux, l'ambiance est plus festive et solennelle que la V1.
    - **Costumes :** Toujours impeccables.
    - **Zéro Anachronisme Majeur :** Pas de câbles ou d'objets du XXIe siècle.

- **Points Faibles (RÉSISTANCE DE L'IA) :**
    - **Locomotive (ÉCHEC PERSISTANT) :** Malgré la directive, l'IA persiste à dessiner une locomotive de 1900. Elle n'arrive pas à concevoir la "frêleté" technique de 1837. 
    - **Infrastructure :** Pas de "muddy rutted tracks" visibles, le ballast est trop propre et moderne.
    - **Rails :** Les rails ont un profil d'acier moderne (Vignole), alors qu'en 1837 on utilisait souvent des rails à "ventre de poisson" (fish-bellied) ou des barres de fer sur blocs de pierre.

- **Note :** L'image est belle et utilisable pour le grand public, mais elle montre que pour la technologie de pointe d'une époque (trains, avions, navires), il faut donner des références de modèles précis à l'IA pour qu'elle sorte de ses clichés.

---
## Historique des Améliorations Appliquées
- **[2024-01-30]** : Passage de Claude à Gemini pour plus de rigueur sur les couleurs militaires.
- **[2024-01-30]** : Renforcement du Negative Prompt (anti-moteurs, anti-pneus) pour les époques pré-1900.
- **[2024-01-30]** : Augmentation de la Guidance Scale à 4.5.

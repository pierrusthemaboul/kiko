📚 Lexique - Sélection d'événements
🎯 Difficulté par niveau (dans levelConfigs.ts)
timeGap : Objet définissant l'écart temporel cible entre événements
base : Écart idéal en années (ex: 250 ans au niveau 1)
minimum : Écart minimal acceptable (ex: 100 ans au niveau 1)
variance : Plage de variation autorisée (ex: 120 ans au niveau 1)
Écart réel peut aller de minimum à base + variance
🔍 Pools de notoriété (dans useEventSelector.ts)
minNotoriete : Score minimum de notoriété (0-100) pour qu'un événement soit sélectionnable
Niveau 1-2 : minNotoriete = 75 (très connu)
Niveau 3-5 : minNotoriete = 60 (connu)
Niveau 20+ : minNotoriete = 0 (tous événements)
minYear : Année minimum pour filtrer les événements anciens
Niveau 1-2 : minYear = 1800 (époque moderne)
Niveau 15-19 : minYear = -500 (Antiquité incluse)
Pool Tier : Catégorie de difficulté (1-6) basée sur le niveau
Pool 1 : Niveaux 1-2
Pool 2 : Niveaux 3-5
Pool 6 : Niveau 20+
📊 Scoring de sélection (dans scoreEventOptimized)
gapScore : Score basé sur la proximité avec le timeGap idéal
Plus l'écart réel est proche de idealGap, plus le score est élevé
Formule : 35 × max(0, 1 - diffRatio) × randomFactor × alphaProximity
idealGap : Écart idéal calculé = timeGapBase
Actuellement CONSTANT pour tout le niveau (c'est le problème !)
timeDiff : Écart réel en années entre l'événement candidat et l'événement de référence diffRatio : Ratio de déviation = |timeDiff - idealGap| / idealGap
0 = parfait (timeDiff = idealGap)
1 = trop éloigné
proximityFactor : Facteur d'ajustement basé sur l'époque
Actuellement peu utilisé, mais c'est là qu'il faut intervenir !
⚙️ Poids de sélection (dans getWeightsForLevel)
alphaProximity : Poids du score de proximité temporelle
Niveau 1-3 : 1.05
Niveau 13+ : 0.9
betaDifficulty : Poids du score de difficulté (notoriété)
Niveau 1-3 : 1.0
Niveau 13+ : 1.6
gammaNotoriete : Poids du score de correspondance avec notoriété cible
Niveau 1-3 : 0.45
Niveau 13+ : 0.5
🚀 Sauts temporels
forcedJumpEventCount : Compteur déclenchant le prochain saut temporel
Actuellement : tous les 3-5 événements
jumpDistance : Distance du saut en années
Dépend de l'époque de départ (1700+, 1500-1700, etc.)
Biaisé vers le passé lointain si en ère moderne
targetYear : Année cible du saut temporel
🎲 Autres mécanismes
bonusEventCountdown : Trigger pour événements bonus (tous les 8-10) shouldForceEasyEvent : Flag anti-frustration après 2+ erreurs consécutives
Force un événement avec notoriété ≥ 70
antiqueEventsCount : Compteur limitant les événements antiques par niveau
💡 Ce que je comprends de ta demande
Tu veux que idealGap soit dynamique et dépende de l'année de l'événement de référence : Exemple de ce que tu veux :
Référence = 1995 → idealGap = 5-10 ans (très serré, proche de 2024)
Référence = 1850 → idealGap = 30-50 ans (modéré)
Référence = 500 → idealGap = 100-200 ans (large, Moyen-Âge)
Référence = -200 → idealGap = 200-400 ans (très large, Antiquité)
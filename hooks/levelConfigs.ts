import { LevelConfig, SpecialRules } from "./types";

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  // --- Niveaux 1 à 14 inchangés ---
  1: {
    level: 1,
    name: "Novice",
    description: "Premiers pas dans l'histoire",
    eventsNeeded: 5,
    timeGap: { base: 500, variance: 200, minimum: 300 },
    eventSelection: {
      minDifficulty: 1, maxDifficulty: 1, universalOnly: true, specialEventChance: 0,
      preferModernEvents: true, modernEventThreshold: 1900, modernEventPreference: 0.9, balancePeriods: true
    },
    scoring: { basePoints: 100, streakMultiplier: 1.0, timeMultiplier: 1.0, comboThreshold: 2 },
    pointsReward: 100,
  },
  2: {
    level: 2, name: "Explorateur", description: "Découverte des événements faciles", eventsNeeded: 6,
    timeGap: { base: 450, variance: 200, minimum: 250 },
    eventSelection: {
      minDifficulty: 1, maxDifficulty: 2, universalOnly: false, specialEventChance: 0.05,
      preferModernEvents: true, modernEventThreshold: 1850, modernEventPreference: 0.8, balancePeriods: true
    },
    scoring: { basePoints: 110, streakMultiplier: 1.1, timeMultiplier: 1.05, comboThreshold: 2 },
    pointsReward: 150,
  },
  3: {
    level: 3, name: "Initié", description: "Introduction aux événements moyens", eventsNeeded: 7,
    timeGap: { base: 400, variance: 150, minimum: 200 },
    eventSelection: {
      minDifficulty: 1, maxDifficulty: 3, universalOnly: false, specialEventChance: 0.1,
      preferModernEvents: true, modernEventThreshold: 1800, modernEventPreference: 0.7, balancePeriods: true
    },
    scoring: { basePoints: 120, streakMultiplier: 1.2, timeMultiplier: 1.1, comboThreshold: 3 },
    pointsReward: 200,
  },
  4: {
    level: 4, name: "Voyageur Temporel", description: "Événements faciles et moyens mélangés", eventsNeeded: 8,
    timeGap: { base: 350, variance: 150, minimum: 150 },
    eventSelection: {
      minDifficulty: 2, maxDifficulty: 3, universalOnly: false, specialEventChance: 0.15,
      preferModernEvents: true, modernEventThreshold: 1700, modernEventPreference: 0.6, balancePeriods: true
    },
    scoring: { basePoints: 130, streakMultiplier: 1.2, timeMultiplier: 1.15, comboThreshold: 3 },
    pointsReward: 250,
  },
  5: {
    level: 5, name: "Chroniqueur", description: "Principalement des événements moyens", eventsNeeded: 9,
    timeGap: { base: 300, variance: 100, minimum: 100 },
    eventSelection: {
      minDifficulty: 2, maxDifficulty: 4, universalOnly: false, specialEventChance: 0.2,
      preferModernEvents: true, modernEventThreshold: 1600, modernEventPreference: 0.4, balancePeriods: true
    },
    scoring: { basePoints: 140, streakMultiplier: 1.3, timeMultiplier: 1.2, comboThreshold: 4 },
    pointsReward: 300,
  },
  6: {
    level: 6, name: "Historien Amateur", description: "Introduction aux événements difficiles", eventsNeeded: 10,
    timeGap: { base: 250, variance: 100, minimum: 75 },
    eventSelection: {
      minDifficulty: 3, maxDifficulty: 4, universalOnly: false, specialEventChance: 0.25,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 150, streakMultiplier: 1.4, timeMultiplier: 1.25, comboThreshold: 4 },
    pointsReward: 350,
  },
  7: {
    level: 7, name: "Historien Éclairé", description: "Événements moyens et difficiles", eventsNeeded: 11,
    timeGap: { base: 200, variance: 75, minimum: 50 },
    eventSelection: {
      minDifficulty: 3, maxDifficulty: 5, universalOnly: false, specialEventChance: 0.3,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 160, streakMultiplier: 1.5, timeMultiplier: 1.3, comboThreshold: 5 },
    pointsReward: 400,
  },
  8: {
    level: 8, name: "Maître du Temps", description: "Tous types d'événements commencent à apparaître", eventsNeeded: 12,
    timeGap: { base: 150, variance: 75, minimum: 50 },
    eventSelection: {
      minDifficulty: 2, maxDifficulty: 5, universalOnly: false, specialEventChance: 0.35,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 170, streakMultiplier: 1.6, timeMultiplier: 1.35, comboThreshold: 5 },
    pointsReward: 450,
  },
  9: {
    level: 9, name: "Savant Historique", description: "Événements complexes à démêler", eventsNeeded: 13,
    timeGap: { base: 125, variance: 50, minimum: 40 },
    eventSelection: {
      minDifficulty: 3, maxDifficulty: 6, universalOnly: false, specialEventChance: 0.4,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 180, streakMultiplier: 1.7, timeMultiplier: 1.4, comboThreshold: 6 },
    pointsReward: 500,
  },
  10: {
    level: 10, name: "Expert Historien", description: "Principalement des événements difficiles", eventsNeeded: 14,
    timeGap: { base: 100, variance: 50, minimum: 30 },
    eventSelection: {
      minDifficulty: 4, maxDifficulty: 6, universalOnly: false, specialEventChance: 0.45,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 190, streakMultiplier: 1.8, timeMultiplier: 1.45, comboThreshold: 6 },
    pointsReward: 550,
  },
  11: {
    level: 11, name: "Grand Historien", description: "Un défi pour les érudits", eventsNeeded: 15,
    timeGap: { base: 80, variance: 40, minimum: 25 },
    eventSelection: {
      minDifficulty: 4, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.5,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 200, streakMultiplier: 1.9, timeMultiplier: 1.5, comboThreshold: 7 },
    pointsReward: 600,
  },
  12: {
    level: 12, name: "Historien Légendaire", description: "Seuls les plus grands réussissent", eventsNeeded: 16,
    timeGap: { base: 60, variance: 30, minimum: 20 },
    eventSelection: {
      minDifficulty: 5, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.55,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 210, streakMultiplier: 2.0, timeMultiplier: 1.55, comboThreshold: 7 },
    pointsReward: 650,
  },
  13: {
    level: 13, name: "Maître Historien", description: "Ultime épreuve de connaissance", eventsNeeded: 17,
    timeGap: { base: 40, variance: 20, minimum: 15 },
    eventSelection: {
      minDifficulty: 5, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.6,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 220, streakMultiplier: 2.1, timeMultiplier: 1.6, comboThreshold: 8 },
    pointsReward: 700,
  },
  14: {
    level: 14, name: "Oracle du Temps", description: "Seul le temps nous le dira", eventsNeeded: 18,
    timeGap: { base: 20, variance: 10, minimum: 10 },
    eventSelection: {
      minDifficulty: 6, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.65,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 230, streakMultiplier: 2.2, timeMultiplier: 1.65, comboThreshold: 8 },
    pointsReward: 750,
  },
  15: {
    // Ancien niveau 15 "Dieu", maintenant une étape avant la fin
    level: 15,
    name: "Gardien des Époques", // Nouveau nom
    description: "Aux portes de l'éternité...", // Nouvelle description
    eventsNeeded: 19, // Légère augmentation
    timeGap: {
      base: 15, // Encore plus serré
      variance: 5,
      minimum: 5,
    },
    eventSelection: {
      minDifficulty: 6, // Maintien de la difficulté
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.7, // Maintien de la chance
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 240, // Augmentation
      streakMultiplier: 2.3, // Augmentation
      timeMultiplier: 1.7, // Augmentation
      comboThreshold: 9, // Augmentation
    },
    specialRules: [],
    pointsReward: 800, // Augmentation
  },

  // --- NOUVEAUX NIVEAUX ---
  16: {
    level: 16,
    name: "Architecte du Temps",
    description: "Façonnez votre propre légende",
    eventsNeeded: 20, // +1
    timeGap: {
      base: 12, // Très serré
      variance: 4,
      minimum: 4,
    },
    eventSelection: {
      minDifficulty: 6, // On reste sur les plus durs
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.72, // Légère augmentation
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 250,
      streakMultiplier: 2.35,
      timeMultiplier: 1.75,
      comboThreshold: 9,
    },
    specialRules: [],
    pointsReward: 850,
  },
  17: {
    level: 17,
    name: "Entité Temporelle",
    description: "Vous transcendez les âges",
    eventsNeeded: 21, // +1
    timeGap: {
      base: 10, // Extrêmement serré
      variance: 3,
      minimum: 3,
    },
    eventSelection: {
      minDifficulty: 6, // On force quasiment que les plus durs
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.74,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 260,
      streakMultiplier: 2.4,
      timeMultiplier: 1.8,
      comboThreshold: 10, // Seuil de combo plus élevé
    },
    specialRules: [],
    pointsReward: 900,
  },
  18: {
    level: 18,
    name: "Conscience Cosmique",
    description: "L'histoire n'a plus de secrets",
    eventsNeeded: 22, // +1
    timeGap: {
      base: 8, // Quasi adjacent
      variance: 2,
      minimum: 2,
    },
    eventSelection: {
      minDifficulty: 7, // Que les plus difficiles
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.76,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 275,
      streakMultiplier: 2.45,
      timeMultiplier: 1.85,
      comboThreshold: 10,
    },
    specialRules: [],
    pointsReward: 950,
  },
  19: {
    level: 19,
    name: "Maître de l'Univers Historique",
    description: "Le défi ultime avant l'infini",
    eventsNeeded: 23, // +1, dernière étape finie
    timeGap: {
      base: 5, // Très très proche
      variance: 1,
      minimum: 1, // Minimum absolu
    },
    eventSelection: {
      minDifficulty: 7, // Que difficulté max
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.78,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 290,
      streakMultiplier: 2.5, // Cap du multiplicateur de série
      timeMultiplier: 1.9, // Presque le double pour le temps
      comboThreshold: 11,
    },
    specialRules: [],
    pointsReward: 1000, // Grosse récompense avant le dernier
  },
  20: {
    level: 20,
    name: "Le Flux Éternel", // Nom évoquant l'infini
    description: "Combien de temps tiendrez-vous ?", // Description pour l'endurance
    eventsNeeded: 99999, // Nombre virtuellement infini
    timeGap: {
      base: 1, // Minimum absolu
      variance: 0, // Aucune variance
      minimum: 1, // Minimum absolu
    },
    eventSelection: {
      minDifficulty: 7, // Que le plus dur
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.8, // Très forte chance d'événement spécial (si définis)
      preferModernEvents: false,
      balancePeriods: false // Ne plus forcer l'équilibre, peut rester longtemps dans une période difficile
    },
    scoring: {
      basePoints: 300, // Points de base élevés
      streakMultiplier: 2.5, // Cap maintenu
      timeMultiplier: 2.0, // Cap du multiplicateur de temps
      comboThreshold: 12, // Seuil de combo très élevé
    },
    specialRules: [], // Possibilité d'ajouter des règles spéciales ici plus tard
    pointsReward: 5000, // Récompense symbolique très élevée si jamais atteint (improbable)
  },
};

export default LEVEL_CONFIGS;
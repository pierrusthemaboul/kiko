import { LevelConfig, SpecialRules } from "./types";

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  // --- Niveaux 1 à 14 avec récompenses équilibrées ---
  1: {
    level: 1,
    name: "Novice",
    description: "Premiers pas dans l'histoire",
    eventsNeeded: 5,
    timeGap: { base: 320, variance: 180, minimum: 150 },
    eventSelection: {
      minDifficulty: 1, maxDifficulty: 1, universalOnly: true, specialEventChance: 0,
      preferModernEvents: true, modernEventThreshold: 1900, modernEventPreference: 0.9, balancePeriods: true
    },
    scoring: { basePoints: 100, streakMultiplier: 1.0, timeMultiplier: 1.0, comboThreshold: 2 },
    pointsReward: 200, // Augmenté de 100 → 200
  },
  2: {
    level: 2, name: "Explorateur", description: "Découverte des événements faciles", eventsNeeded: 6,
    timeGap: { base: 300, variance: 160, minimum: 130 },
    eventSelection: {
      minDifficulty: 1, maxDifficulty: 2, universalOnly: false, specialEventChance: 0.05,
      preferModernEvents: true, modernEventThreshold: 1850, modernEventPreference: 0.8, balancePeriods: true
    },
    scoring: { basePoints: 110, streakMultiplier: 1.1, timeMultiplier: 1.05, comboThreshold: 2 },
    pointsReward: 250, // Augmenté de 150 → 250
  },
  3: {
    level: 3, name: "Initié", description: "Introduction aux événements moyens", eventsNeeded: 7,
    timeGap: { base: 260, variance: 140, minimum: 110 },
    eventSelection: {
      minDifficulty: 1, maxDifficulty: 3, universalOnly: false, specialEventChance: 0.1,
      preferModernEvents: true, modernEventThreshold: 1800, modernEventPreference: 0.7, balancePeriods: true
    },
    scoring: { basePoints: 120, streakMultiplier: 1.2, timeMultiplier: 1.1, comboThreshold: 3 },
    pointsReward: 300, // Augmenté de 200 → 300
  },
  4: {
    level: 4, name: "Voyageur Temporel", description: "Événements faciles et moyens mélangés", eventsNeeded: 8,
    timeGap: { base: 350, variance: 150, minimum: 150 },
    eventSelection: {
      minDifficulty: 2, maxDifficulty: 3, universalOnly: false, specialEventChance: 0.15,
      preferModernEvents: true, modernEventThreshold: 1700, modernEventPreference: 0.6, balancePeriods: true
    },
    scoring: { basePoints: 130, streakMultiplier: 1.2, timeMultiplier: 1.15, comboThreshold: 3 },
    pointsReward: 350, // Augmenté de 250 → 350
  },
  5: {
    level: 5, name: "Chroniqueur", description: "Principalement des événements moyens", eventsNeeded: 9,
    timeGap: { base: 300, variance: 100, minimum: 100 },
    eventSelection: {
      minDifficulty: 2, maxDifficulty: 4, universalOnly: false, specialEventChance: 0.2,
      preferModernEvents: true, modernEventThreshold: 1600, modernEventPreference: 0.4, balancePeriods: true
    },
    scoring: { basePoints: 140, streakMultiplier: 1.3, timeMultiplier: 1.2, comboThreshold: 4 },
    pointsReward: 400, // Augmenté de 300 → 400
  },
  6: {
    level: 6, name: "Historien Amateur", description: "Introduction aux événements difficiles", eventsNeeded: 10,
    timeGap: { base: 250, variance: 100, minimum: 75 },
    eventSelection: {
      minDifficulty: 3, maxDifficulty: 4, universalOnly: false, specialEventChance: 0.25,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 150, streakMultiplier: 1.4, timeMultiplier: 1.25, comboThreshold: 4 },
    pointsReward: 450, // Augmenté de 350 → 450
  },
  7: {
    level: 7, name: "Historien Éclairé", description: "Événements moyens et difficiles", eventsNeeded: 11,
    timeGap: { base: 200, variance: 75, minimum: 50 },
    eventSelection: {
      minDifficulty: 3, maxDifficulty: 5, universalOnly: false, specialEventChance: 0.3,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 160, streakMultiplier: 1.5, timeMultiplier: 1.3, comboThreshold: 5 },
    pointsReward: 500, // Augmenté de 400 → 500
  },
  8: {
    level: 8, name: "Maître du Temps", description: "Tous types d'événements commencent à apparaître", eventsNeeded: 12,
    timeGap: { base: 150, variance: 75, minimum: 50 },
    eventSelection: {
      minDifficulty: 2, maxDifficulty: 5, universalOnly: false, specialEventChance: 0.35,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 170, streakMultiplier: 1.6, timeMultiplier: 1.35, comboThreshold: 5 },
    pointsReward: 550, // Augmenté de 450 → 550
  },
  9: {
    level: 9, name: "Savant Historique", description: "Événements complexes à démêler", eventsNeeded: 13,
    timeGap: { base: 125, variance: 50, minimum: 40 },
    eventSelection: {
      minDifficulty: 3, maxDifficulty: 6, universalOnly: false, specialEventChance: 0.4,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 180, streakMultiplier: 1.7, timeMultiplier: 1.4, comboThreshold: 6 },
    pointsReward: 600, // Augmenté de 500 → 600
  },
  10: {
    level: 10, name: "Expert Historien", description: "Principalement des événements difficiles", eventsNeeded: 14,
    timeGap: { base: 100, variance: 50, minimum: 30 },
    eventSelection: {
      minDifficulty: 4, maxDifficulty: 6, universalOnly: false, specialEventChance: 0.45,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 190, streakMultiplier: 1.8, timeMultiplier: 1.45, comboThreshold: 6 },
    pointsReward: 650, // Augmenté de 550 → 650
  },
  11: {
    level: 11, name: "Grand Historien", description: "Un défi pour les érudits", eventsNeeded: 15,
    timeGap: { base: 80, variance: 40, minimum: 25 },
    eventSelection: {
      minDifficulty: 4, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.5,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 200, streakMultiplier: 1.9, timeMultiplier: 1.5, comboThreshold: 7 },
    pointsReward: 700, // Augmenté de 600 → 700
  },
  12: {
    level: 12, name: "Historien Légendaire", description: "Seuls les plus grands réussissent", eventsNeeded: 16,
    timeGap: { base: 60, variance: 30, minimum: 20 },
    eventSelection: {
      minDifficulty: 5, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.55,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 210, streakMultiplier: 2.0, timeMultiplier: 1.55, comboThreshold: 7 },
    pointsReward: 750, // Augmenté de 650 → 750
  },
  13: {
    level: 13, name: "Maître Historien", description: "Ultime épreuve de connaissance", eventsNeeded: 17,
    timeGap: { base: 40, variance: 20, minimum: 15 },
    eventSelection: {
      minDifficulty: 5, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.6,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 220, streakMultiplier: 2.1, timeMultiplier: 1.6, comboThreshold: 8 },
    pointsReward: 800, // Augmenté de 700 → 800
  },
  14: {
    level: 14, name: "Oracle du Temps", description: "Seul le temps nous le dira", eventsNeeded: 18,
    timeGap: { base: 20, variance: 10, minimum: 10 },
    eventSelection: {
      minDifficulty: 6, maxDifficulty: 7, universalOnly: false, specialEventChance: 0.65,
      preferModernEvents: false, balancePeriods: true
    },
    scoring: { basePoints: 230, streakMultiplier: 2.2, timeMultiplier: 1.65, comboThreshold: 8 },
    pointsReward: 850, // Augmenté de 750 → 850
  },
  15: {
    level: 15,
    name: "Gardien des Époques",
    description: "Aux portes de l'éternité...",
    eventsNeeded: 19,
    timeGap: {
      base: 15,
      variance: 5,
      minimum: 5,
    },
    eventSelection: {
      minDifficulty: 6,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.7,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 240,
      streakMultiplier: 2.3,
      timeMultiplier: 1.7,
      comboThreshold: 9,
    },
    specialRules: [],
    pointsReward: 900, // Augmenté de 800 → 900
  },

  // --- NIVEAUX 16-19 avec récompenses équilibrées ---
  16: {
    level: 16,
    name: "Architecte du Temps",
    description: "Façonnez votre propre légende",
    eventsNeeded: 20,
    timeGap: {
      base: 12,
      variance: 4,
      minimum: 4,
    },
    eventSelection: {
      minDifficulty: 6,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.72,
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
    pointsReward: 950, // Augmenté de 850 → 950
  },
  17: {
    level: 17,
    name: "Entité Temporelle",
    description: "Vous transcendez les âges",
    eventsNeeded: 21,
    timeGap: {
      base: 10,
      variance: 3,
      minimum: 3,
    },
    eventSelection: {
      minDifficulty: 6,
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
      comboThreshold: 10,
    },
    specialRules: [],
    pointsReward: 1000, // Augmenté de 900 → 1000
  },
  18: {
    level: 18,
    name: "Conscience Cosmique",
    description: "L'histoire n'a plus de secrets",
    eventsNeeded: 22,
    timeGap: {
      base: 8,
      variance: 2,
      minimum: 2,
    },
    eventSelection: {
      minDifficulty: 7,
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
    pointsReward: 1100, // Augmenté de 950 → 1100
  },
  19: {
    level: 19,
    name: "Maître de l'Univers Historique",
    description: "Le défi ultime avant l'infini",
    eventsNeeded: 23,
    timeGap: {
      base: 5,
      variance: 1,
      minimum: 1,
    },
    eventSelection: {
      minDifficulty: 7,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.78,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 290,
      streakMultiplier: 2.5,
      timeMultiplier: 1.9,
      comboThreshold: 11,
    },
    specialRules: [],
    pointsReward: 1200, // Augmenté de 1000 → 1200
  },
  20: {
    level: 20,
    name: "Le Flux Éternel",
    description: "Combien de temps tiendrez-vous ?",
    eventsNeeded: 99999, // Niveau infini
    timeGap: {
      base: 1,
      variance: 0,
      minimum: 1,
    },
    eventSelection: {
      minDifficulty: 7,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.8,
      preferModernEvents: false,
      balancePeriods: false
    },
    scoring: {
      basePoints: 300,
      streakMultiplier: 2.5,
      timeMultiplier: 2.0,
      comboThreshold: 12,
    },
    specialRules: [],
    pointsReward: 2000, // Récompense symbolique élevée (mais niveau infini)
  },
};

export default LEVEL_CONFIGS;

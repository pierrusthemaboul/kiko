import { LevelConfig, SpecialRules } from "./types";

export const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    level: 1,
    name: "Novice",
    description: "Premiers pas dans l'histoire",
    eventsNeeded: 5,
    timeGap: {
      base: 500,
      variance: 200,
      minimum: 300,
    },
    eventSelection: {
      minDifficulty: 1,
      maxDifficulty: 1,
      universalOnly: true,
      specialEventChance: 0,
      // Nouvelles propriétés pour contrôler la préférence d'époque
      preferModernEvents: true,          // Privilégier les événements récents
      modernEventThreshold: 1900,        // Considérer comme "moderne" après 1900 (20e siècle)
      modernEventPreference: 0.9,        // Probabilité très forte (90%) de choisir un événement moderne
      balancePeriods: true               // Équilibrer les périodes (ne pas rester bloqué dans une époque)
    },
    scoring: {
      basePoints: 100,
      streakMultiplier: 1.0,
      timeMultiplier: 1.0,
      comboThreshold: 2,
    },
    specialRules: [],
    pointsReward: 100,
  },
  2: {
    level: 2,
    name: "Explorateur",
    description: "Découverte des événements faciles",
    eventsNeeded: 6,
    timeGap: {
      base: 450,
      variance: 200,
      minimum: 250,
    },
    eventSelection: {
      minDifficulty: 1,
      maxDifficulty: 2,
      universalOnly: false,
      specialEventChance: 0.05,
      // Niv 2: Toujours préférer mais moins fortement
      preferModernEvents: true,
      modernEventThreshold: 1850,         // Élargir à partir de la 2e moitié du 19e siècle
      modernEventPreference: 0.8,         // 80% de chance
      balancePeriods: true
    },
    scoring: {
      basePoints: 110,
      streakMultiplier: 1.1,
      timeMultiplier: 1.05,
      comboThreshold: 2,
    },
    specialRules: [],
    pointsReward: 150,
  },
  3: {
    level: 3,
    name: "Initié",
    description: "Introduction aux événements moyens",
    eventsNeeded: 7,
    timeGap: {
      base: 400,
      variance: 150,
      minimum: 200,
    },
    eventSelection: {
      minDifficulty: 1,
      maxDifficulty: 3,
      universalOnly: false,
      specialEventChance: 0.1,
      // Niv 3: Préférence réduite
      preferModernEvents: true,
      modernEventThreshold: 1800,         // Élargir à partir du 19e siècle
      modernEventPreference: 0.7,         // 70% de chance
      balancePeriods: true
    },
    scoring: {
      basePoints: 120,
      streakMultiplier: 1.2,
      timeMultiplier: 1.1,
      comboThreshold: 3,
    },
    specialRules: [],
    pointsReward: 200,
  },
  4: {
    level: 4,
    name: "Voyageur Temporel",
    description: "Événements faciles et moyens mélangés",
    eventsNeeded: 8,
    timeGap: {
      base: 350,
      variance: 150,
      minimum: 150,
    },
    eventSelection: {
      minDifficulty: 2,
      maxDifficulty: 3,
      universalOnly: false,
      specialEventChance: 0.15,
      // Niv 4: Préférence encore plus réduite
      preferModernEvents: true,
      modernEventThreshold: 1700,         // Élargir à partir du 18e siècle
      modernEventPreference: 0.6,         // 60% de chance
      balancePeriods: true
    },
    scoring: {
      basePoints: 130,
      streakMultiplier: 1.2,
      timeMultiplier: 1.15,
      comboThreshold: 3,
    },
    specialRules: [],
    pointsReward: 250,
  },
  5: {
    level: 5,
    name: "Chroniqueur",
    description: "Principalement des événements moyens",
    eventsNeeded: 9,
    timeGap: {
      base: 300,
      variance: 100,
      minimum: 100,
    },
    eventSelection: {
      minDifficulty: 2,
      maxDifficulty: 4,
      universalOnly: false,
      specialEventChance: 0.2,
      // Niv 5: Légère préférence finale
      preferModernEvents: true,
      modernEventThreshold: 1600,         // Élargir à partir de la Renaissance
      modernEventPreference: 0.4,         // 40% de chance (presque équilibré)
      balancePeriods: true
    },
    scoring: {
      basePoints: 140,
      streakMultiplier: 1.3,
      timeMultiplier: 1.2,
      comboThreshold: 4,
    },
    specialRules: [],
    pointsReward: 300,
  },
  6: {
    level: 6,
    name: "Historien Amateur",
    description: "Introduction aux événements difficiles",
    eventsNeeded: 10,
    timeGap: {
      base: 250,
      variance: 100,
      minimum: 75,
    },
    eventSelection: {
      minDifficulty: 3,
      maxDifficulty: 4,
      universalOnly: false,
      specialEventChance: 0.25,
      // À partir du niveau 6: pas de préférence d'époque
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 150,
      streakMultiplier: 1.4,
      timeMultiplier: 1.25,
      comboThreshold: 4,
    },
    specialRules: [],
    pointsReward: 350,
  },
  7: {
    level: 7,
    name: "Historien Éclairé",
    description: "Événements moyens et difficiles",
    eventsNeeded: 11,
    timeGap: {
      base: 200,
      variance: 75,
      minimum: 50,
    },
    eventSelection: {
      minDifficulty: 3,
      maxDifficulty: 5,
      universalOnly: false,
      specialEventChance: 0.3,
      // Pas de préférence
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 160,
      streakMultiplier: 1.5,
      timeMultiplier: 1.3,
      comboThreshold: 5,
    },
    specialRules: [],
    pointsReward: 400,
  },
  8: {
    level: 8,
    name: "Maître du Temps",
    description: "Tous types d'événements commencent à apparaître",
    eventsNeeded: 12,
    timeGap: {
      base: 150,
      variance: 75,
      minimum: 50,
    },
    eventSelection: {
      minDifficulty: 2,
      maxDifficulty: 5,
      universalOnly: false,
      specialEventChance: 0.35,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 170,
      streakMultiplier: 1.6,
      timeMultiplier: 1.35,
      comboThreshold: 5,
    },
    specialRules: [],
    pointsReward: 450,
  },
  9: {
    level: 9,
    name: "Savant Historique",
    description: "Événements complexes à démêler",
    eventsNeeded: 13,
    timeGap: {
      base: 125,
      variance: 50,
      minimum: 40,
    },
    eventSelection: {
      minDifficulty: 3,
      maxDifficulty: 6,
      universalOnly: false,
      specialEventChance: 0.4,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 180,
      streakMultiplier: 1.7,
      timeMultiplier: 1.4,
      comboThreshold: 6,
    },
    specialRules: [],
    pointsReward: 500,
  },
  10: {
    level: 10,
    name: "Expert Historien",
    description: "Principalement des événements difficiles",
    eventsNeeded: 14,
    timeGap: {
      base: 100,
      variance: 50,
      minimum: 30,
    },
    eventSelection: {
      minDifficulty: 4,
      maxDifficulty: 6,
      universalOnly: false,
      specialEventChance: 0.45,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 190,
      streakMultiplier: 1.8,
      timeMultiplier: 1.45,
      comboThreshold: 6,
    },
    specialRules: [],
    pointsReward: 550,
  },
  11: {
    level: 11,
    name: "Grand Historien",
    description: "Un défi pour les érudits",
    eventsNeeded: 15,
    timeGap: {
      base: 80,
      variance: 40,
      minimum: 25,
    },
    eventSelection: {
      minDifficulty: 4,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.5,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 200,
      streakMultiplier: 1.9,
      timeMultiplier: 1.5,
      comboThreshold: 7,
    },
    specialRules: [],
    pointsReward: 600,
  },
  12: {
    level: 12,
    name: "Historien Légendaire",
    description: "Seuls les plus grands réussissent",
    eventsNeeded: 16,
    timeGap: {
      base: 60,
      variance: 30,
      minimum: 20,
    },
    eventSelection: {
      minDifficulty: 5,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.55,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 210,
      streakMultiplier: 2.0,
      timeMultiplier: 1.55,
      comboThreshold: 7,
    },
    specialRules: [],
    pointsReward: 650,
  },
  13: {
    level: 13,
    name: "Maître Historien",
    description: "Ultime épreuve de connaissance",
    eventsNeeded: 17,
    timeGap: {
      base: 40,
      variance: 20,
      minimum: 15,
    },
    eventSelection: {
      minDifficulty: 5,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.6,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 220,
      streakMultiplier: 2.1,
      timeMultiplier: 1.6,
      comboThreshold: 8,
    },
    specialRules: [],
    pointsReward: 700,
  },
  14: {
    level: 14,
    name: "Oracle du Temps",
    description: "Seul le temps nous le dira",
    eventsNeeded: 18,
    timeGap: {
      base: 20,
      variance: 10,
      minimum: 10,
    },
    eventSelection: {
      minDifficulty: 6,
      maxDifficulty: 7,
      universalOnly: false,
      specialEventChance: 0.65,
      preferModernEvents: false,
      balancePeriods: true
    },
    scoring: {
      basePoints: 230,
      streakMultiplier: 2.2,
      timeMultiplier: 1.65,
      comboThreshold: 8,
    },
    specialRules: [],
    pointsReward: 750,
  },
  15: {
    level: 15,
    name: "Dieu",
    description: "Le boss final",
    eventsNeeded: 10000,
    timeGap: {
      base: 1,
      variance: 1,
      minimum: 1,
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
      basePoints: 1000,
      streakMultiplier: 2.3,
      timeMultiplier: 1.7,
      comboThreshold: 9,
    },
    specialRules: [],
    pointsReward: 1000,
  },
};

export default LEVEL_CONFIGS;
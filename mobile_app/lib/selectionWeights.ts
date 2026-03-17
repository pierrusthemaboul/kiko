export type Weights = {
  alphaProximity: number;
  betaDifficulty: number;
  gammaNotoriete: number;
  thetaFrequencyMalus: number;
  thetaFrequencyCap: number;
};

export function getWeightsForLevel(level: number): Weights {
  if (level <= 3) {
    return {
      alphaProximity: 1.2,      // Très forte priorité à la proximité temporelle (évite les pièges)
      betaDifficulty: 1.0,
      gammaNotoriete: 0.6,      // Forte importance de la notoriété (avoir des événements connus)
      thetaFrequencyMalus: 25,
      thetaFrequencyCap: 500,
    };
  }

  if (level <= 8) {
    return {
      alphaProximity: 1.1,
      betaDifficulty: 1.2,
      gammaNotoriete: 0.5,      // On commence à accepter des événements un peu moins connus
      thetaFrequencyMalus: 22,
      thetaFrequencyCap: 700,
    };
  }

  if (level <= 15) {
    return {
      alphaProximity: 0.9,      // On s'autorise des écarts plus variés
      betaDifficulty: 1.4,
      gammaNotoriete: 0.4,      // On accepte du "Tier 2" plus facilement
      thetaFrequencyMalus: 20,
      thetaFrequencyCap: 900,
    };
  }

  return {
    alphaProximity: 0.7,      // Priorité faible au temps (événements très proches possibles)
    betaDifficulty: 1.8,
    gammaNotoriete: 0.3,      // Les événements inconnus (Tier 3) ressortent autant que les connus
    thetaFrequencyMalus: 18,
    thetaFrequencyCap: 1000,
  };
}

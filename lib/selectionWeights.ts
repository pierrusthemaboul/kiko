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
      alphaProximity: 1.05,
      betaDifficulty: 1.0,
      gammaNotoriete: 0.45,
      thetaFrequencyMalus: 20,
      thetaFrequencyCap: 450,
    };
  }

  if (level <= 7) {
    return {
      alphaProximity: 1.0,
      betaDifficulty: 1.2,
      gammaNotoriete: 0.55,
      thetaFrequencyMalus: 18,
      thetaFrequencyCap: 650,
    };
  }

  if (level <= 12) {
    return {
      alphaProximity: 0.95,
      betaDifficulty: 1.35,
      gammaNotoriete: 0.55,
      thetaFrequencyMalus: 18,
      thetaFrequencyCap: 800,
    };
  }

  return {
    alphaProximity: 0.9,
    betaDifficulty: 1.6,
    gammaNotoriete: 0.5,
    thetaFrequencyMalus: 20,
    thetaFrequencyCap: 900,
  };
}

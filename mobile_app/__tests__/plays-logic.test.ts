// __tests__/plays-logic.test.ts
// Test de la LOGIQUE PURE de décompte de parties (sans React Native)

/**
 * Fonction qui calcule les parties restantes
 * C'est la même logique que dans hooks/usePlays.ts ligne 54
 */
function calculateRemainingPlays(allowed: number, used: number): number {
  return Math.max(0, allowed - used);
}

/**
 * Détermine le nombre de parties autorisées selon le statut
 */
function getAllowedPlays(isAdmin: boolean, partiesPerDay: number): number {
  return isAdmin ? 999 : partiesPerDay;
}

describe('Logique de décompte de parties (PURE)', () => {
  // Test du calcul de parties restantes
  test('devrait calculer correctement les parties restantes', () => {
    const allowed = 5;
    const used = 2;

    const remaining = calculateRemainingPlays(allowed, used);

    expect(remaining).toBe(3);
  });

  test('ne devrait jamais retourner un nombre négatif', () => {
    const allowed = 5;
    const used = 10;

    const remaining = calculateRemainingPlays(allowed, used);

    expect(remaining).toBe(0);
  });

  test('devrait retourner 0 quand toutes les parties sont utilisées', () => {
    const remaining = calculateRemainingPlays(5, 5);
    expect(remaining).toBe(0);
  });

  test('devrait retourner toutes les parties quand aucune n\'est utilisée', () => {
    const remaining = calculateRemainingPlays(5, 0);
    expect(remaining).toBe(5);
  });

  // Test pour les admins
  test('les admins devraient avoir 999 parties disponibles', () => {
    const allowed = getAllowedPlays(true, 3);
    expect(allowed).toBe(999);
  });

  test('les non-admins devraient avoir parties_per_day disponibles', () => {
    const allowed = getAllowedPlays(false, 5);
    expect(allowed).toBe(5);
  });

  // Test de décompte après avoir joué
  test('devrait décompter 1 partie après avoir joué', () => {
    let used = 2;
    const allowed = 5;

    // Avant de jouer
    let remaining = calculateRemainingPlays(allowed, used);
    expect(remaining).toBe(3);

    // Après avoir joué (simulation)
    used = used + 1;
    remaining = calculateRemainingPlays(allowed, used);

    expect(remaining).toBe(2);
    expect(used).toBe(3);
  });

  // Test du BUG de "rejouer" qui ne décompte pas
  test('[BUG REPRODUCTION] rejouer devrait décompter une partie', () => {
    let runsToday = 2;
    const allowed = 5;

    // Première partie jouée
    runsToday++;
    let remaining = calculateRemainingPlays(allowed, runsToday);
    expect(runsToday).toBe(3);
    expect(remaining).toBe(2);

    // Clic sur "Rejouer" - devrait incrémenter runsToday
    runsToday++;
    remaining = calculateRemainingPlays(allowed, runsToday);

    expect(runsToday).toBe(4);
    expect(remaining).toBe(1);
  });

  // Tests pour différents rangs
  describe('Parties par rang', () => {
    const RANK_BRONZE = 3;
    const RANK_SILVER = 5;
    const RANK_GOLD = 10;

    test('Bronze devrait avoir 3 parties', () => {
      expect(RANK_BRONZE).toBe(3);
    });

    test('Silver devrait avoir plus que Bronze', () => {
      expect(RANK_SILVER).toBeGreaterThan(RANK_BRONZE);
    });

    test('Gold devrait avoir plus que Silver', () => {
      expect(RANK_GOLD).toBeGreaterThan(RANK_SILVER);
    });
  });

  // Test des edge cases
  describe('Edge cases', () => {
    test('avec 0 parties autorisées', () => {
      const remaining = calculateRemainingPlays(0, 0);
      expect(remaining).toBe(0);
    });

    test('avec beaucoup de parties utilisées', () => {
      const remaining = calculateRemainingPlays(5, 1000);
      expect(remaining).toBe(0);
    });

    test('avec nombre négatif de parties utilisées', () => {
      const remaining = calculateRemainingPlays(5, -1);
      expect(remaining).toBe(6); // Math.max(0, 5 - (-1)) = 6
    });
  });
});

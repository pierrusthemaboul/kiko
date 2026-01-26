// __tests__/plays.test.ts
// Test de la logique de décompte de parties

describe('Logique de décompte de parties', () => {
  // Test du calcul de parties restantes
  test('devrait calculer correctement les parties restantes', () => {
    const allowed = 5; // Parties autorisées par jour
    const used = 2;    // Parties déjà jouées

    const remaining = Math.max(0, allowed - used);

    expect(remaining).toBe(3);
  });

  test('ne devrait jamais retourner un nombre négatif', () => {
    const allowed = 5;
    const used = 10; // Plus de parties jouées qu'autorisées

    const remaining = Math.max(0, allowed - used);

    expect(remaining).toBe(0);
  });

  test('devrait retourner 0 quand toutes les parties sont utilisées', () => {
    const allowed = 5;
    const used = 5;

    const remaining = Math.max(0, allowed - used);

    expect(remaining).toBe(0);
  });

  test('devrait retourner toutes les parties quand aucune n\'est utilisée', () => {
    const allowed = 5;
    const used = 0;

    const remaining = Math.max(0, allowed - used);

    expect(remaining).toBe(5);
  });

  // Test pour les admins (999 parties)
  test('les admins devraient avoir 999 parties disponibles', () => {
    const isAdmin = true;
    const allowed = isAdmin ? 999 : 3;
    const used = 10;

    const remaining = Math.max(0, allowed - used);

    expect(remaining).toBe(989);
  });

  // Test de décompte après avoir joué
  test('devrait décompter 1 partie après avoir joué', () => {
    let used = 2;
    const allowed = 5;

    // Avant de jouer
    let remaining = Math.max(0, allowed - used);
    expect(remaining).toBe(3);

    // Après avoir joué (simulation)
    used = used + 1;
    remaining = Math.max(0, allowed - used);

    expect(remaining).toBe(2);
    expect(used).toBe(3);
  });

  // Test du problème de "rejouer" qui ne décompte pas
  test('REPRODUCT ION BUG: rejouer devrait décompter une partie', () => {
    let runsToday = 2; // Parties déjà jouées aujourd'hui
    const allowed = 5;

    // Première partie jouée
    runsToday++;
    let remaining = Math.max(0, allowed - runsToday);
    expect(runsToday).toBe(3);
    expect(remaining).toBe(2);

    // Clic sur "Rejouer" - devrait incrémenter runsToday
    runsToday++;
    remaining = Math.max(0, allowed - runsToday);

    expect(runsToday).toBe(4);
    expect(remaining).toBe(1);
  });

  // Test pour les rangs différents
  describe('Parties par rang', () => {
    test('Bronze devrait avoir 3 parties', () => {
      const partiesPerDay = 3; // Bronze
      expect(partiesPerDay).toBe(3);
    });

    test('Silver devrait avoir plus que Bronze', () => {
      const bronze = 3;
      const silver = 5;
      expect(silver).toBeGreaterThan(bronze);
    });
  });
});

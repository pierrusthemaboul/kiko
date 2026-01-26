# 🔍 Guide de debugging Reactotron - Problème de décompte de parties

## 📍 Où ajouter les logs

### 1. Dans `app/game/GameScreen.tsx` - Fonction `handleActualRestart` (ligne ~149)

```typescript
const handleActualRestart = useCallback(async () => {
  // 🔍 LOG REACTOTRON - AVANT REJOUER
  console.tron.display({
    name: '🎮 REJOUER - DÉBUT',
    preview: 'Utilisateur appuie sur Rejouer',
    value: {
      playsInfo_avant: playsInfo,
      canStartRun_avant: canStartRun,
      timestamp: new Date().toISOString()
    },
    important: true
  });

  if (isRestarting) return;

  setIsRestarting(true);

  // Code existant...
  if (gameLogic.resetAdsState) {
    gameLogic.resetAdsState();
  }

  if (gameLogic.resetGameFlowState) {
    gameLogic.resetGameFlowState();
  }

  if (gameLogic.initGame) {
    try {
      // 🔍 LOG REACTOTRON - AVANT initGame
      console.tron.log('📞 Appel gameLogic.initGame()');

      await gameLogic.initGame();

      // 🔍 LOG REACTOTRON - APRÈS initGame
      console.tron.log('✅ gameLogic.initGame() terminé');

    } catch (error) {
      console.tron.error('❌ Erreur dans initGame:', error);
    }
  }

  setGameKey(prevKey => prevKey + 1);
  fadeAnim.setValue(0);
  Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

  // 🔍 LOG REACTOTRON - APRÈS REJOUER
  console.tron.display({
    name: '🎮 REJOUER - FIN',
    preview: 'Rejouer terminé',
    value: {
      playsInfo_apres: playsInfo,
      canStartRun_apres: canStartRun,
      timestamp: new Date().toISOString()
    },
    important: true
  });

  setTimeout(() => setIsRestarting(false), 150);
}, [
  gameLogic.initGame,
  gameLogic.resetAdsState,
  gameLogic.resetGameFlowState,
  gameLogic.gameMode,
  startRun,
  canStartRun,
  playsInfo,
  fadeAnim,
]);
```

---

### 2. Dans `hooks/usePlays.ts` - Fonction `fetchPlaysInfo` (ligne ~17)

```typescript
const fetchPlaysInfo = useCallback(async () => {
  // 🔍 LOG REACTOTRON - DÉBUT FETCH
  console.tron.display({
    name: '🔄 FETCH PLAYS INFO',
    preview: 'Récupération des parties restantes',
    value: { timestamp: new Date().toISOString() },
    important: false
  });

  setLoading(true);
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      console.tron.warn('❌ Pas d\'utilisateur authentifié');
      setPlaysInfo(null);
      setCanStartRun(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('parties_per_day, is_admin')
      .eq('id', authUser.id)
      .single();

    const isAdmin = profile?.is_admin === true;
    const allowed = isAdmin ? 999 : (profile?.parties_per_day ?? 3);

    Logger.debug('Plays', `Fetching info for user ${authUser.id}`, { isAdmin, allowed });

    const window = todayWindow();
    const { count: runsToday, error: countError } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .gte('started_at', window.start)
      .lt('started_at', window.end);

    if (countError) {
      Logger.error('Plays', 'Error counting runs', countError);
      console.tron.error('❌ Erreur count runs:', countError);
      throw countError;
    }

    const used = runsToday ?? 0;
    const remaining = Math.max(0, allowed - used);
    const info = { allowed, used, remaining };

    // 🔍 LOG REACTOTRON - RÉSULTAT FETCH
    console.tron.display({
      name: '✅ PLAYS INFO CALCULÉ',
      preview: `${remaining} parties restantes`,
      value: {
        allowed,
        used,
        remaining,
        isAdmin,
        userId: authUser.id,
        window: { start: window.start, end: window.end },
        runsToday
      },
      important: true
    });

    Logger.debug('Plays', 'Calculated plays info', info);

    setPlaysInfo(info);
    setCanStartRun(remaining > 0 || isAdmin);
  } catch (error) {
    Logger.error('Plays', 'Failed to fetch plays info', error);
    console.tron.error('❌ ERREUR fetchPlaysInfo:', error);
    setPlaysInfo(null);
    setCanStartRun(false);
  } finally {
    setLoading(false);
  }
}, []);
```

---

### 3. Dans `hooks/game/useInitGame.ts` (où la partie est enregistrée en DB)

Trouve la fonction qui enregistre la partie dans `game_sessions` et ajoute :

```typescript
// 🔍 LOG REACTOTRON - AVANT ENREGISTREMENT DB
console.tron.display({
  name: '💾 ENREGISTREMENT PARTIE',
  preview: 'Sauvegarde dans game_sessions',
  value: {
    user_id: userId,
    timestamp: new Date().toISOString()
  },
  important: true
});

// ... ton code d'insertion dans game_sessions

// 🔍 LOG REACTOTRON - APRÈS ENREGISTREMENT DB
console.tron.log('✅ Partie enregistrée dans DB');
```

---

## 🚀 Comment utiliser

### 1. Lance Reactotron Desktop
- Ouvre l'application Reactotron depuis le menu Démarrer
- Attends qu'elle soit prête (tu verras "Waiting for connections...")

### 2. Lance ton app React Native
```bash
pnpm start
# Puis dans un autre terminal :
pnpm android
```

### 3. Observe dans Reactotron
Tu verras apparaître dans l'ordre :

1. **"🔄 FETCH PLAYS INFO"** → Quand l'app charge les parties restantes
2. **"✅ PLAYS INFO CALCULÉ"** → Les parties disponibles
3. **Joue une partie**
4. **Clique sur "Rejouer"**
5. **"🎮 REJOUER - DÉBUT"** → Début du processus rejouer
6. **"📞 Appel gameLogic.initGame()"** → Initialisation nouvelle partie
7. **"💾 ENREGISTREMENT PARTIE"** → Sauvegarde en DB
8. **"✅ Partie enregistrée dans DB"** → Confirmation
9. **"🔄 FETCH PLAYS INFO"** → Rechargement des parties (devrait se produire automatiquement)
10. **"✅ PLAYS INFO CALCULÉ"** → Nouveau compteur

---

## 🔍 Ce qu'on cherche

**Si le bug se produit, tu verras :**
- ✅ Étape 6 se produit (initGame appelé)
- ❌ MAIS étape 9 ne se produit PAS (pas de refresh du compteur)
- ❌ OU étape 7 ne se produit PAS (partie non enregistrée en DB)

**Cela nous dira exactement où est le problème :**
- Si étape 7 manque → Problème d'enregistrement en DB
- Si étape 9 manque → Problème de refresh du compteur
- Si toutes les étapes se produisent → Problème de cache ou de timing

---

## 💡 Commandes Reactotron utiles

Dans Reactotron, tu peux aussi :
- Cliquer sur un log pour voir les détails
- Filtrer par importance (⭐ important)
- Rechercher des mots-clés ("REJOUER", "PLAYS", etc.)
- Voir l'ordre chronologique exact

---

## ⚠️ Important

N'oublie pas de retirer ces logs une fois le bug résolu, pour ne pas polluer la console en production.

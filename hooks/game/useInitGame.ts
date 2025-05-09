// /home/pierre/sword/kiko/hooks/useInitGame.ts
// ----- VERSION COMPLÈTE AVEC PLUS DE LOGS DANS INITGAME ET USEEFFECT -----

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase/supabaseClients'; // Ajuste le chemin si nécessaire
import { FirebaseAnalytics } from '../../lib/firebase'; // Ajuste le chemin si nécessaire
import { Event, User, MAX_LIVES, LevelHistory } from '../types'; // Ajuste le chemin si nécessaire
import { LEVEL_CONFIGS } from '../levelConfigs'; // Ajuste le chemin si nécessaire
import { useEventSelector } from './useEventSelector'; // Ajuste le chemin si nécessaire

/**
 * Hook pour initialiser et gérer les états de base du jeu
 */
export function useInitGame() {
  // --- États initiaux ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(0);

  const initialUserState: User = {
    name: '',
    points: 0,
    lives: MAX_LIVES,
    level: 1,
    eventsCompletedInLevel: 0,
    totalEventsCompleted: 0,
    streak: 0,
    maxStreak: 0,
    performanceStats: {
      typeSuccess: {},
      periodSuccess: {},
      overallAccuracy: 0,
      averageResponseTime: 0
    }
  };
  const [user, setUser] = useState<User>(initialUserState);

  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [previousEvent, setPreviousEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Event | null>(null);
  const [usedEvents, setUsedEvents] = useState<Set<string>>(new Set());
  const [displayedEvent, setDisplayedEvent] = useState<Event | null>(null);
  const [levelsHistory, setLevelsHistory] = useState<LevelHistory[]>([]);

  // Refs pour rendre initGame idempotent et identifier l'instance
  const isInitializingRef = useRef(false);
  const hasInitializedSuccessfullyRef = useRef(false);
  // Donne un ID aléatoire court à chaque instance de ce hook pour le suivi des logs
  const instanceIdRef = useRef(Math.random().toString(36).substring(2, 8));

  // Intégration de useEventSelector (pour isAntiqueEvent etc.)
  const dummyUpdateStateCallback = useCallback(async (_event: Event) => {}, []);
  const dummySetError = useCallback((_error: string) => {}, []);
  const dummySetIsGameOver = useCallback((_isGameOver: boolean) => {}, []);

  const {
    isAntiqueEvent,
    updateAntiqueCount,
    resetAntiqueCount
  } = useEventSelector({
    setError: dummySetError,
    setIsGameOver: dummySetIsGameOver,
    updateStateCallback: dummyUpdateStateCallback,
  });

  /**
   * Récupération des données utilisateur
   */
  const fetchUserData = useCallback(async (hookInstanceId: string) => {
    console.log(`[FetchUserData - Instance ${hookInstanceId}] Fetching user data...`);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.log(`[FetchUserData - Instance ${hookInstanceId}] No authenticated user found or error.`, authError?.message);
        setUser(prev => ({ ...prev, name: prev.name || '' })); // Garde le nom si déjà défini, sinon vide
        setHighScore(0); // Pas de meilleur score pour un invité
        return;
      }
      console.log(`[FetchUserData - Instance ${hookInstanceId}] User found: ${authUser.id}. Fetching profile...`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, high_score')
        .eq('id', authUser.id)
        .single();
      if (profileError) {
        console.error(`[FetchUserData - Instance ${hookInstanceId}] Error fetching profile:`, profileError.message);
        // Fallback: utilise l'email si le profil échoue mais l'utilisateur auth existe
        setUser(prev => ({ ...prev, name: prev.name || authUser.email || '' }));
        setHighScore(0); // Reset high score sur erreur
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'fetchUserData');
      } else if (profileData) {
        console.log(`[FetchUserData - Instance ${hookInstanceId}] Profile data found:`, profileData);
        const displayName = profileData.display_name || authUser.email || '';
        const userHighScore = profileData.high_score || 0;
        setUser(prev => ({ ...prev, name: displayName })); // Met à jour l'état user avec le nom
        setHighScore(userHighScore); // Met à jour l'état highScore
        FirebaseAnalytics.setUserProperty('display_name', displayName);
      } else {
        console.warn(`[FetchUserData - Instance ${hookInstanceId}] User exists in auth but no profile found.`);
        setUser(prev => ({ ...prev, name: prev.name || authUser.email || '' })); // Fallback email
        setHighScore(0); // Pas de profil = pas de high score
      }
    } catch (err) {
      console.error(`[FetchUserData - Instance ${hookInstanceId}] Unexpected error:`, err);
      setUser(prev => ({ ...prev, name: prev.name || '' })); // Fallback nom
      setHighScore(0); // Reset high score sur erreur
      FirebaseAnalytics.error('unexpected_fetch_user', err instanceof Error ? err.message : 'Unknown', 'fetchUserData');
    }
  }, []); // Aucune dépendance externe nécessaire pour fetchUserData lui-même

  /**
   * Fonction principale d'initialisation du jeu (AVEC SELECTION INITIALE ALÉATOIRE ET LOGS)
   */
  const initGame = useCallback(async () => {
    const currentInstanceId = instanceIdRef.current; // Utilise l'ID constant de cette instance
    console.log(`[InitGame - Random Initial - Instance ${currentInstanceId}] STARTING initGame`);

    if (isInitializingRef.current) {
      console.log(`[InitGame - Instance ${currentInstanceId}] Already initializing, skipping.`);
      return;
    }

    console.log(`[InitGame - Instance ${currentInstanceId}] Setting up initial state...`);
    isInitializingRef.current = true;
    hasInitializedSuccessfullyRef.current = false;
    setLoading(true);
    setError(null);

    // Réinitialiser les états du jeu - IMPORTANT: préserve le nom si déjà récupéré
    setLevelsHistory([]);
    setUsedEvents(new Set());
    resetAntiqueCount();
    setUser(prev => ({
      ...initialUserState, // Reset toutes les stats de jeu
      name: prev.name, // Garde le nom potentiellement déjà défini par fetchUserData
    }));
    setPreviousEvent(null);
    setNewEvent(null);
    setDisplayedEvent(null);

    try {
      // Récupère/Met à jour les infos utilisateur (qui préserve le nom si déjà là)
      await fetchUserData(currentInstanceId);

      const initialConfig = LEVEL_CONFIGS[1];
      if (!initialConfig) throw new Error('Configuration du niveau 1 manquante');

      console.log(`[InitGame - Instance ${currentInstanceId}] Fetching ALL events...`);
      const { data: allEventsData, error: eventsError } = await supabase
        .from('evenements')
        .select('*');

      if (eventsError) throw eventsError;
      if (!allEventsData?.length) throw new Error('Aucun événement disponible');

      const validEvents = allEventsData.filter((event): event is Event =>
        !!event.id && !!event.date && !!event.titre &&
        (event.illustration_url === null || event.illustration_url === undefined || typeof event.illustration_url === 'string') &&
        event.niveau_difficulte != null && Array.isArray(event.types_evenement)
      );
      console.log(`[InitGame - Instance ${currentInstanceId}] Found ${validEvents.length} total valid events.`);
      if (validEvents.length < 2) throw new Error("Pas assez d'événements valides (min 2).");

      setAllEvents(validEvents);

      console.log(`[InitGame - Instance ${currentInstanceId}] Selecting initial pair RANDOMLY...`);
      const level1Events = validEvents.filter(e => e.niveau_difficulte === 1);
      console.log(`[InitGame - Instance ${currentInstanceId}] Found ${level1Events.length} level 1 events.`);
      if (level1Events.length < 2) throw new Error(`Pas assez d'événements de niveau 1 (min 2, trouvé ${level1Events.length}).`);

      // --- MODIFICATION : Sélection Aléatoire ---
      const shuffledLevel1Events = [...level1Events].sort(() => 0.5 - Math.random());
      // Log pour voir le résultat du mélange aléatoire
      console.log(`[InitGame - Instance ${currentInstanceId}] Shuffled Level 1 IDs (first 5):`, shuffledLevel1Events.slice(0, 5).map(e => e.id));

      const firstEvent = shuffledLevel1Events[0];
      const secondEvent = shuffledLevel1Events[1];
      // --- FIN MODIFICATION ---

      if (!firstEvent || !secondEvent) throw new Error("Erreur interne: échec de la sélection aléatoire des événements initiaux.");

      console.log(`[InitGame - Instance ${currentInstanceId}] SELECTED Initial Pair:`); // Log avant de setter l'état
      console.log(`  Event 1 (Prev): ${firstEvent.titre} (ID: ${firstEvent.id})`);
      console.log(`  Event 2 (New):  ${secondEvent.titre} (ID: ${secondEvent.id})`);

      // Mettre à jour l'état
      setPreviousEvent(firstEvent);
      setNewEvent(secondEvent);
      setDisplayedEvent(secondEvent); // Afficher le second événement initialement
      setUsedEvents(new Set([firstEvent.id, secondEvent.id]));
      if (isAntiqueEvent(firstEvent)) updateAntiqueCount(firstEvent);
      if (isAntiqueEvent(secondEvent)) updateAntiqueCount(secondEvent);

      // Log Analytics - Utilise une fonction pour obtenir l'état user le plus récent possible
      const logAnalyticsAfterStateUpdate = () => {
        setUser(currentUserState => {
            const currentUserName = currentUserState.name || 'Anonymous';
            FirebaseAnalytics.gameStarted(currentUserName, !currentUserState.name, 1);
            FirebaseAnalytics.levelStarted(1, initialConfig.name || 'Niveau 1', initialConfig.eventsNeeded, 0);
            return currentUserState; // Ne change pas l'état, utilise juste la valeur fraîche
        });
      }
      // Appel légerement différé pour s'assurer que l'état user est à jour après fetchUserData
      setTimeout(logAnalyticsAfterStateUpdate, 0);


      console.log(`[InitGame - Instance ${currentInstanceId}] Initialization complete.`);
      hasInitializedSuccessfullyRef.current = true;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue lors de l'initialisation";
      console.error(`[InitGame - Instance ${currentInstanceId}] Initialization FAILED:`, errorMsg, err);
      setError(errorMsg);
      FirebaseAnalytics.error('game_initialization', errorMsg, 'initGame');
      hasInitializedSuccessfullyRef.current = false;
    } finally {
      console.log(`[InitGame - Instance ${currentInstanceId}] FINALLY block: Setting initializingRef=false, loading=false`);
      isInitializingRef.current = false;
      setLoading(false);
    }
  }, [ // Dépendances pour initGame useCallback
      fetchUserData,
      resetAntiqueCount,
      updateAntiqueCount,
      isAntiqueEvent,
      // Pas besoin des setters ici
    ]
  );

  // Exécuter initGame une seule fois au montage initial de chaque instance du hook
  useEffect(() => {
    const currentInstanceId = instanceIdRef.current; // Récupère l'ID unique de cette instance
    console.log(`[InitGame Hook - Instance ${currentInstanceId}] useEffect[] TRIGGERED. Calling initGame().`);
    initGame(); // Appelle la fonction initGame (stable grâce à useCallback)

    // Fonction de nettoyage pour cette instance spécifique
    return () => {
        console.log(`[InitGame Hook - Instance ${currentInstanceId}] CLEANUP useEffect[]`);
        // Peut-être annuler des requêtes en cours si nécessaire
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initGame]); // Dépend uniquement de initGame (qui est stable)

  // Retourner les états et fonctions
  return {
    loading,
    error,
    highScore,
    user,
    allEvents,
    previousEvent,
    newEvent,
    usedEvents,
    levelsHistory,
    displayedEvent,
    // Setters
    setUser,
    setPreviousEvent,
    setNewEvent,
    setUsedEvents,
    setLevelsHistory,
    setDisplayedEvent,
    setError,
    setLoading,
    setHighScore, // Exposer si nécessaire
    // Actions
    initGame, // Exposer pour réinitialisation manuelle si VRAIMENT nécessaire (préférer la clé)
    fetchUserData, // Exposer si nécessaire
  };
}
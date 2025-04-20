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
  // États d'initialisation et de chargement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(0);

  // États du jeu
  const [user, setUser] = useState<User>({
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
  });

  // États des événements
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [previousEvent, setPreviousEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Event | null>(null);
  const [usedEvents, setUsedEvents] = useState<Set<string>>(new Set());
  const [displayedEvent, setDisplayedEvent] = useState<Event | null>(null);
  const [levelsHistory, setLevelsHistory] = useState<LevelHistory[]>([]);

  // --- AJOUT : Refs pour rendre initGame idempotent ---
  const isInitializingRef = useRef(false); // Pour suivre si l'init est déjà en cours
  const hasInitializedSuccessfullyRef = useRef(false); // Pour suivre si l'init a réussi au moins une fois

  // --- Intégration de useEventSelector ---
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
  // --- Fin de l'intégration ---

  /**
   * Récupération des données utilisateur
   */
  const fetchUserData = useCallback(async () => {
    console.log("[FetchUserData] Fetching user data...");
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        console.log("[FetchUserData] No authenticated user found or error.", authError?.message);
        setUser(prev => ({ ...prev, name: prev.name || '' }));
        setHighScore(0);
        return;
      }
      console.log(`[FetchUserData] User found: ${authUser.id}. Fetching profile...`);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, high_score')
        .eq('id', authUser.id)
        .single();
      if (profileError) {
        console.error("[FetchUserData] Error fetching profile:", profileError.message);
        setUser(prev => ({ ...prev, name: prev.name || authUser.email || '' }));
        setHighScore(0);
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'fetchUserData');
      } else if (profileData) {
        console.log("[FetchUserData] Profile data found:", profileData);
        const displayName = profileData.display_name || authUser.email || '';
        const userHighScore = profileData.high_score || 0;
        setUser(prev => ({ ...prev, name: displayName }));
        setHighScore(userHighScore);
        FirebaseAnalytics.setUserProperty('display_name', displayName);
      } else {
        console.warn("[FetchUserData] User exists in auth but no profile found.");
        setUser(prev => ({ ...prev, name: prev.name || authUser.email || '' }));
        setHighScore(0);
      }
    } catch (err) {
      console.error("[FetchUserData] Unexpected error:", err);
      setUser(prev => ({ ...prev, name: prev.name || '' }));
      setHighScore(0);
      FirebaseAnalytics.error('unexpected_fetch_user', err instanceof Error ? err.message : 'Unknown', 'fetchUserData');
    }
  }, []);

  /**
   * Fonction principale d'initialisation du jeu (Version Simplifiée et Idempotente)
   */
  const initGame = useCallback(async () => {
    // --- AJOUT : Protection contre les appels multiples / redondants ---
    if (isInitializingRef.current) {
      console.log("[InitGame - Simplified] Already initializing, skipping call.");
      return; // Déjà en cours, ne rien faire
    }
    // Si l'initialisation a déjà réussi une fois, on ne la relance pas automatiquement
    // (sauf si appelée explicitement par un redémarrage par exemple)
    // Le useEffect ci-dessous gérera le premier appel.
    // On pourrait ajouter une vérification ici aussi si on veut être très strict.
    // Exemple: if (hasInitializedSuccessfullyRef.current) { console.log(...); return; }
    // Mais laissons le useEffect gérer le premier appel pour l'instant.
    // -----------------------------------------------------------------

    console.log("[InitGame - Simplified] Starting game initialization...");
    isInitializingRef.current = true; // Marquer comme en cours
    hasInitializedSuccessfullyRef.current = false; // Réinitialiser le flag de succès pour CET essai
    setLoading(true); // Indiquer le début du chargement (important pour la logique UI)
    setError(null); // Réinitialiser les erreurs

    // Réinitialiser les états du jeu
    setLevelsHistory([]);
    setUsedEvents(new Set());
    resetAntiqueCount();
    setUser(prev => ({
      name: prev.name, // Garder le nom déjà récupéré
      points: 0,
      lives: MAX_LIVES,
      level: 1,
      eventsCompletedInLevel: 0,
      totalEventsCompleted: 0,
      streak: 0,
      maxStreak: 0,
      performanceStats: { typeSuccess: {}, periodSuccess: {}, overallAccuracy: 0, averageResponseTime: 0 }
    }));
    // Reset des events pour éviter un flash de l'ancien contenu si l'init échoue
    setPreviousEvent(null);
    setNewEvent(null);
    setDisplayedEvent(null);

    try {
      // Récupérer/Mettre à jour les infos utilisateur
      await fetchUserData();

      const initialConfig = LEVEL_CONFIGS[1];
      if (!initialConfig) throw new Error('Configuration du niveau 1 manquante');

      console.log("[InitGame - Simplified] Fetching ALL events...");
      const { data: allEventsData, error: eventsError } = await supabase
        .from('evenements')
        .select('*');

      if (eventsError) throw eventsError;
      if (!allEventsData?.length) throw new Error('Aucun événement disponible dans la base de données');

      const validEvents = allEventsData.filter((event): event is Event =>
        !!event.id && !!event.date && !!event.titre &&
        (event.illustration_url === null || event.illustration_url === undefined || typeof event.illustration_url === 'string') &&
        event.niveau_difficulte != null && Array.isArray(event.types_evenement)
      );
      console.log(`[InitGame - Simplified] Found ${validEvents.length} total valid events.`);
      if (validEvents.length < 2) throw new Error("Pas assez d'événements valides disponibles (besoin d'au moins 2).");

      setAllEvents(validEvents);

      console.log("[InitGame - Simplified] Selecting initial pair...");
      const level1Events = validEvents.filter(e => e.niveau_difficulte === 1);
      console.log(`[InitGame - Simplified] Found ${level1Events.length} level 1 events.`);
      if (level1Events.length < 2) throw new Error(`Pas assez d'événements de niveau 1 (besoin d'au moins 2, trouvé ${level1Events.length}).`);

      const sortedLevel1Events = [...level1Events].sort((a, b) => (a.frequency_score || 0) - (b.frequency_score || 0));
      const initialSelectionPoolSize = Math.min(20, sortedLevel1Events.length);
      const selectionPool = sortedLevel1Events.slice(0, initialSelectionPoolSize);
      console.log(`[InitGame - Simplified] Selecting initial pair from a pool of ${selectionPool.length} low-frequency level 1 events.`);

      const indices = [...Array(selectionPool.length).keys()];
      const shuffledIndices = indices.sort(() => 0.5 - Math.random());
      if (shuffledIndices.length < 2) throw new Error("Erreur interne: impossible de sélectionner deux indices distincts.");

      const firstEvent = selectionPool[shuffledIndices[0]];
      const secondEvent = selectionPool[shuffledIndices[1]];
      if (!firstEvent || !secondEvent) throw new Error("Erreur interne: échec de la sélection des événements initiaux.");

      console.log(`[InitGame - Simplified] Selected Initial Pair:`);
      console.log(`  Event 1: ${firstEvent.titre} (ID: ${firstEvent.id}, Date: ${firstEvent.date}, Freq: ${firstEvent.frequency_score || 0})`);
      console.log(`  Event 2: ${secondEvent.titre} (ID: ${secondEvent.id}, Date: ${secondEvent.date}, Freq: ${secondEvent.frequency_score || 0})`);

      // Mettre à jour l'état SEULEMENT après succès de toutes les étapes précédentes
      setPreviousEvent(firstEvent);
      setNewEvent(secondEvent);
      setDisplayedEvent(secondEvent);
      setUsedEvents(new Set([firstEvent.id, secondEvent.id]));
      if (isAntiqueEvent(firstEvent)) updateAntiqueCount(firstEvent);
      if (isAntiqueEvent(secondEvent)) updateAntiqueCount(secondEvent);

      // Log Analytics
      const currentUserName = user.name || 'Anonymous'; // Utilise le nom mis à jour ou fallback
      FirebaseAnalytics.gameStarted(currentUserName, !user.name, 1);
      FirebaseAnalytics.levelStarted(1, initialConfig.name || 'Niveau 1', initialConfig.eventsNeeded, 0);

      console.log("[InitGame - Simplified] Initialization complete.");
      hasInitializedSuccessfullyRef.current = true; // --- Marquer comme réussi ---

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue lors de l'initialisation";
      console.error("[InitGame - Simplified] Initialization failed:", errorMsg, err);
      setError(errorMsg);
      FirebaseAnalytics.error('game_initialization', errorMsg, 'initGame');
      hasInitializedSuccessfullyRef.current = false; // --- Marquer comme échoué ---
    } finally {
      isInitializingRef.current = false; // --- Marquer comme terminé (succès ou échec) ---
      setLoading(false); // Assurer que l'indicateur de chargement est désactivé
    }
  }, [ // Dépendances de useCallback
      fetchUserData,
      resetAntiqueCount,
      updateAntiqueCount,
      isAntiqueEvent,
      // Pas besoin de lister les setters (setLoading, setError, setUser, etc.)
      // Pas besoin de lister user.name car il est lu DANS fetchUserData ou utilisé après.
    ]
  );

  // Exécuter initGame une seule fois au montage initial
  useEffect(() => {
    // Cet effet ne s'exécute qu'une fois grâce au tableau de dépendances vide.
    // On appelle initGame() qui contient maintenant la logique pour éviter les exécutions multiples.
    console.log("[InitGame Hook] useEffect[] triggered. Calling initGame().");
    initGame();

    // Laisser le tableau de dépendances vide [] pour exécuter seulement au montage du hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ATTENTION: garder les deps vides est crucial ici pour que CE useEffect ne cause pas de rappels. initGame est stable grâce à useCallback.

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
    setUser,
    setPreviousEvent,
    setNewEvent,
    setUsedEvents,
    setLevelsHistory,
    setDisplayedEvent,
    setError,
    setLoading,
    initGame, // Fonction pour (re)démarrer le jeu (maintenant idempotente)
    fetchUserData,
    setHighScore
  };
}
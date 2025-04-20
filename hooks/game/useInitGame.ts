import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../../lib/firebase';
import { Event, User, MAX_LIVES, HistoricalPeriod, LevelHistory } from '../types';
import { LEVEL_CONFIGS } from '../levelConfigs';

/**
 * Hook pour initialiser et gérer les états de base du jeu
 */
export function useInitGame() {
  console.log('[useInitGame] Hook initialisation');

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
  
  // État pour suivre l'événement actuellement affiché (pour éviter les transitions instables)
  const [displayedEvent, setDisplayedEvent] = useState<Event | null>(null);
  
  // Historique des niveaux
  const [levelsHistory, setLevelsHistory] = useState<LevelHistory[]>([]);

  /**
   * Récupération des données utilisateur (nom + high score)
   */
  const fetchUserData = useCallback(async () => {
    console.log('[useInitGame] fetchUserData: Récupération des données utilisateur');
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        console.log('[useInitGame] Utilisateur non authentifié ou erreur:', authError?.message);
        setUser(prev => ({ ...prev, name: prev.name || '' }));
        setHighScore(0);
        return;
      }

      console.log('[useInitGame] Utilisateur authentifié:', authUser.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, high_score')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('[useInitGame] Erreur récupération profil:', profileError.message);
        setUser(prev => ({ ...prev, name: prev.name || '' }));
        setHighScore(0);
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'fetchUserData');
      } else if (profileData) {
        console.log('[useInitGame] Profil récupéré:', profileData.display_name, 'high score:', profileData.high_score);
        setUser(prev => ({
          ...prev,
          name: profileData.display_name || authUser.email || ''
        }));
        setHighScore(profileData.high_score || 0);
        FirebaseAnalytics.setUserProperty('display_name', profileData.display_name);
      } else {
        console.log('[useInitGame] Profil non trouvé, utilisation email comme nom');
        setUser(prev => ({ ...prev, name: authUser.email || '' }));
        setHighScore(0);
      }
    } catch (err) {
      console.error('[useInitGame] Erreur inattendue:', err);
      setUser(prev => ({ ...prev, name: prev.name || '' }));
      setHighScore(0);
      FirebaseAnalytics.error('unexpected_fetch_user', err instanceof Error ? err.message : 'Unknown', 'fetchUserData');
    }
  }, []);

  /**
   * Fonction principale d'initialisation du jeu
   * CORRECTION: Assurer une configuration stable des événements initiaux
   */
  const initGame = useCallback(async () => {
    console.log('[useInitGame] Initialisation du jeu');
    
    try {
      setLoading(true);
      setError(null);
      setLevelsHistory([]);
      setUsedEvents(new Set());
      
      // Réinitialiser l'utilisateur mais garder son nom et high score
      setUser(prev => ({
        ...prev,
        points: 0,
        lives: MAX_LIVES,
        level: 1,
        eventsCompletedInLevel: 0,
        totalEventsCompleted: 0,
        streak: 0,
        maxStreak: 0,
      }));

      await fetchUserData();

      const initialConfig = LEVEL_CONFIGS[1];
      if (!initialConfig) {
        throw new Error('Configuration du niveau 1 manquante');
      }

      console.log('[useInitGame] Récupération des événements depuis Supabase');
      
      const { data: events, error: eventsError } = await supabase
        .from('evenements')
        .select('*')
        .order('date', { ascending: true });

      if (eventsError) {
        console.error('[useInitGame] Erreur récupération événements:', eventsError.message);
        throw eventsError;
      }
      
      if (!events?.length) {
        console.error('[useInitGame] Aucun événement disponible');
        throw new Error('Aucun événement disponible dans la base');
      }

      console.log('[useInitGame] Récupéré', events.length, 'événements');

      // Filtrage des événements valides
      const validEvents = events.filter((event): event is Event =>
        !!event.id &&
        !!event.date &&
        !!event.titre &&
        !!event.illustration_url &&
        event.niveau_difficulte != null &&
        Array.isArray(event.types_evenement)
      );
      
      console.log('[useInitGame] Filtré', validEvents.length, 'événements valides');
      setAllEvents(validEvents);

      if (validEvents.length < 2) {
        console.error('[useInitGame] Pas assez d\'événements valides');
        throw new Error("Pas assez d'événements valides disponibles");
      }

      // Sélection des événements de niveau 1
      const level1Events = validEvents.filter(e => e.niveau_difficulte === 1);
      console.log('[useInitGame] Événements de niveau 1:', level1Events.length);
      
      if (level1Events.length < 2) {
        console.error('[useInitGame] Pas assez d\'événements de niveau 1');
        throw new Error("Pas assez d'événements de niveau 1");
      }

      // --- CORRECTION: Sélection des événements initiaux de façon plus soignée ---
      
      // Sélection du premier événement
      const firstIndex = Math.floor(Math.random() * level1Events.length);
      const firstEvent = level1Events[firstIndex];
      console.log('[useInitGame] Premier événement sélectionné:', firstEvent.titre, 'date:', firstEvent.date);
      
      // Tenter de trouver un second événement avec une différence temporelle significative
      const referenceYear = new Date(firstEvent.date).getFullYear();
      console.log('[useInitGame] Année de référence pour le premier événement:', referenceYear);
      
      // Trier les événements selon leur différence temporelle
      const otherEvents = level1Events.filter(e => e.id !== firstEvent.id);
      
      const eventsWithTimeDiff = otherEvents.map(event => {
        const eventYear = new Date(event.date).getFullYear();
        const diff = Math.abs(eventYear - referenceYear);
        return { event, diff };
      }).sort((a, b) => b.diff - a.diff); // Plus grande différence d'abord
      
      console.log('[useInitGame] Événements triés par différence temporelle:', 
        eventsWithTimeDiff.slice(0, 3).map(e => ({
          titre: e.event.titre, 
          diff: e.diff,
          year: new Date(e.event.date).getFullYear()
        }))
      );
      
      // Sélectionner l'événement avec la plus grande différence temporelle (ou un fallback si nécessaire)
      const secondEvent = eventsWithTimeDiff.length > 0 
        ? eventsWithTimeDiff[0].event  // Événement avec la plus grande différence
        : otherEvents[Math.floor(Math.random() * otherEvents.length)]; // Fallback aléatoire
      
      console.log('[useInitGame] Second événement sélectionné:', secondEvent.titre, 'date:', secondEvent.date);
      console.log('[useInitGame] Différence entre événements en années:', 
        Math.abs(new Date(secondEvent.date).getFullYear() - referenceYear));
      
      // IMPORTANT: Configurer les événements de manière stable pour éviter les transitions confuses
      setPreviousEvent(firstEvent);
      setNewEvent(secondEvent);
      setDisplayedEvent(secondEvent); // Stabiliser l'affichage
      
      // Marquer les deux événements comme utilisés
      setUsedEvents(new Set([firstEvent.id, secondEvent.id]));

      console.log('[useInitGame] Configuration initiale terminée');

      // Tracking analytics
      FirebaseAnalytics.gameStarted(user.name, !user.name || user.name.startsWith('Voyageur'), 1);
      FirebaseAnalytics.levelStarted(1, initialConfig.name || 'Niveau 1', initialConfig.eventsNeeded, 0);

    } catch (err) {
      console.error('[useInitGame] Erreur critique:', err);
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue lors de l'init";
      setError(errorMsg);
      FirebaseAnalytics.error('game_initialization', errorMsg, 'initGame');
    } finally {
      setLoading(false);
      console.log('[useInitGame] Initialisation terminée, état loading:', false);
    }
  }, [fetchUserData, user.name]);

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
    displayedEvent, // Nouvel état exporté
    setUser,
    setPreviousEvent,
    setNewEvent,
    setUsedEvents,
    setLevelsHistory,
    setDisplayedEvent, // Nouveau setter exporté
    setError,
    setLoading,
    initGame,
    fetchUserData
  };
}
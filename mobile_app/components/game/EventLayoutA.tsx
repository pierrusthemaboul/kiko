import React, { useState, useEffect, useRef, useId, useMemo, useCallback, createContext, useContext } from 'react';
import { traceGameRender } from '@/utils/logger';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import AnimatedRe, { useSharedValue, useAnimatedStyle, withTiming, withSequence, runOnJS } from 'react-native-reanimated';
import AnimatedEventCardA from './AnimatedEventCardA'; // Assure-toi que le chemin est correct
import OverlayChoiceButtonsA from './OverlayChoiceButtonsA'; // Assure-toi que le chemin est correct
import { Event } from '@/hooks/types'; // Assure-toi que le chemin et le type Event sont corrects
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ANIMATION_DURATION = 600; // Durée normale
const ANIMATION_DURATION_LEVEL_END = 600; // Durée spéciale pour la fin de niveau (ajusté à 600ms)
// Garde-fou : si l'image du bas ne signale jamais son chargement (URL absente
// ou échec réseau), la carte révélée se retire quand même pour ne pas rester
// bloquée au-dessus de la vraie carte.
const REVEAL_FALLBACK_MS = 1500;
// Attente max du chargement de l'image du slot révélé avant de démarrer la
// transition. Sans ça, la carte qui monte dévoile une sous-couche (ou une
// zone noire) en plein milieu de l'animation. En nominal le prefetch du
// defer rend cette attente quasi nulle.
const TRANSITION_IMAGE_WAIT_MS = 350;

// Contenu dynamique des vues de cartes, passé par contexte pour que
// `props.children` des Animated.View garde une identité stable.
// Pourquoi : sans allowlist, React Native inclut `children` par référence
// dans la clé composite des AnimatedProps (createCompositeKeyForProps).
// Un nouvel élément `children` à chaque render recréait donc le nœud
// AnimatedProps → __restoreDefaultValues() → la vue animée revenait une
// frame à sa position de repos (clignotement au swap et à chaque render).
interface CardSlotContextValue {
  swapped: boolean;
  currentTop: Event | null;
  currentBottom: Event | null;
  newEvent: Event | null;
  layoutId: string;
  streak: number;
  level: number;
  showDate: boolean;
  isCorrect?: boolean;
  bottomFeedback: { eventId?: string; showDate: boolean; isCorrect?: boolean };
  onBottomImageLoaded: (eventId?: string) => void;
}

const CardSlotContext = createContext<CardSlotContextValue | null>(null);

const CardSlotContent: React.FC<{ view: 'A' | 'B' }> = ({ view }) => {
  const ctx = useContext(CardSlotContext);
  if (!ctx) return null;
  const isBottomRole = view === 'A' ? ctx.swapped : !ctx.swapped;
  const event = view === 'A'
    ? (ctx.swapped ? ctx.currentBottom : ctx.currentTop)
    : (ctx.swapped ? ctx.currentTop : ctx.currentBottom);
  const outgoingFeedback =
    isBottomRole && event?.id !== ctx.newEvent?.id && event?.id === ctx.bottomFeedback.eventId
      ? ctx.bottomFeedback
      : null;
  return (
    <View style={styles.bottomCardContent}>
      <AnimatedEventCardA
        event={event}
        position={isBottomRole ? 'bottom' : 'top'}
        debugSlot={`${ctx.layoutId}:${view}`}
        onImageLoad={isBottomRole ? () => ctx.onBottomImageLoaded(event?.id) : undefined}
        showDate={isBottomRole ? outgoingFeedback?.showDate ?? ctx.showDate : true}
        isCorrect={isBottomRole ? (outgoingFeedback ? outgoingFeedback.isCorrect : ctx.isCorrect) : undefined}
        streak={ctx.streak}
        level={ctx.level}
      />
    </View>
  );
};

interface EventLayoutAProps {
  previousEvent: Event | null;
  newEvent: Event | null;
  onImageLoad: () => void;
  onChoice: (choice: 'avant' | 'après') => void;
  showDate?: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  streak: number;
  level: number;
  isLevelPaused: boolean;
  isInitialRender: boolean;
  isLastEventOfLevel?: boolean; // Nouvelle prop pour identifier le dernier événement
  triggerLevelEndAnim?: boolean; // Nouvelle prop pour déclencher l'animation de fin
  isTutorialActive?: boolean; // Nouvelle prop pour bloquer les interactions pendant le tutoriel
  tutorialStep?: number; // Nouvelle prop pour l'étape du tutoriel
}

const EventLayoutA: React.FC<EventLayoutAProps> = ({
  previousEvent,
  newEvent,
  onImageLoad,
  onChoice,
  showDate = false,
  isCorrect,
  isImageLoaded,
  streak,
  level,
  isLevelPaused,
  isInitialRender,
  isLastEventOfLevel = false,
  triggerLevelEndAnim = false,
  isTutorialActive = false,
  tutorialStep = 0,
}) => {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 375 || height < 700;
  const isVerySmallScreen = width < 320 || height < 650;

  const topCardInitialY = 10;
  // Cartes plus grandes qui prennent presque tout l'espace disponible
  const cardHeight = isVerySmallScreen
    ? Math.min(Math.max(Math.round(height * 0.42), 220), 340)
    : Math.min(Math.max(Math.round(height * 0.42), 260), 400);
  const topCardHeight = cardHeight;
  const bottomCardTop = topCardInitialY + topCardHeight + Math.max(Math.round(height * 0.02), isVerySmallScreen ? 8 : 12);
  const bottomCardHeight = cardHeight; // Même hauteur que la carte du haut
  const moveDistance = -(bottomCardTop - topCardInitialY);
  const buttonsBottomOffset = Math.max(insets.bottom + (isVerySmallScreen ? 8 : 16), isVerySmallScreen ? 20 : 28);

  const [transitioning, setTransitioning] = useState(false);
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);
  const bottomFeedbackRef = useRef({ eventId: newEvent?.id, showDate, isCorrect });

  useEffect(() => {
    if (currentBottom?.id === newEvent?.id) {
      bottomFeedbackRef.current = { eventId: newEvent?.id, showDate, isCorrect };
    }
  }, [currentBottom?.id, newEvent?.id, showDate, isCorrect]);
  // Les deux vues de carte alternent de rôle à chaque swap ("paquet de cartes") :
  // la carte qui monte RESTE en haut (aucune remise à zéro de position sur une
  // vue visible → pas de clignotement), et c'est l'ancienne carte du haut,
  // déjà sortie de l'écran, qui est recyclée en bas avec le nouvel événement.
  const [swapped, setSwapped] = useState(false);
  // Slot "révélé" permanent : montre le prochain événement sous la carte du
  // bas (masqué par occlusion), puis passe au-dessus au moment du swap jusqu'à
  // ce que la vraie image de la carte du bas soit chargée. Monté en
  // permanence pour éviter le délai de mount (~65ms) qui laissait le slot
  // vide (fond sombre visible) au début de chaque transition.
  const [revealAbove, setRevealAbove] = useState(false);
  // Suivi du chargement de l'image du slot révélé + transition en attente de
  // cette image (bornée par TRANSITION_IMAGE_WAIT_MS).
  const revealReadyRef = useRef<string | null>(null);
  const pendingTransitionRef = useRef<string | null>(null);
  const transitionWaitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // SharedValues Reanimated : les transforms sont appliqués par le pipeline
  // UI-thread de Reanimated — ils ne peuvent pas être écrasés par un commit
  // Fabric ni par un restoreDefaultValues (fin de la classe de bugs "snap à
  // l'ancre" : translateY qui retombait à 0 pendant 1+ frame).
  const viewATranslateY = useSharedValue(0);
  const viewBTranslateY = useSharedValue(0);
  const viewAScale = useSharedValue(1);
  const viewBScale = useSharedValue(1);
  const viewAOpacity = useSharedValue(1);
  const viewBOpacity = useSharedValue(1);
  // Ancres dans le style animé : `top` et `translateY` passent par le même
  // canal (UI-thread Reanimated) → le swap les applique de façon atomique,
  // impossible d'avoir un frame "nouveau top + vieux translateY" (la vue
  // partait à -371px hors écran = flash du slot vide).
  const viewAAnchorY = useSharedValue(topCardInitialY);
  const viewBAnchorY = useSharedValue(bottomCardTop);
  const prevNewEventIdRef = useRef<string | null>(newEvent?.id ?? null);
  const wasLevelPausedRef = useRef<boolean>(isLevelPaused);
  const lastLoggedCardsRef = useRef<string>('');
  const layoutId = useId();
  const transitionIdRef = useRef(0);
  const transitionStartRef = useRef(0);
  const trace = (action: string, data: Record<string, unknown> = {}) => {
    traceGameRender(action, { layoutId, transitionId: transitionIdRef.current, ...data });
  };

  useEffect(() => {
    trace('layout.mount');
    return () => trace('layout.unmount');
  }, []);

  // Miroir de `swapped` lisible dans les callbacks/effets sans dépendre de la closure
  const swappedRef = useRef(false);
  useEffect(() => {
    swappedRef.current = swapped;
  }, [swapped]);

  // Resync des ancres si les dimensions changent (rotation, fold...) —
  // le rôle courant est suivi par `swapped` (non re-déclenché ici : les
  // ancres sont assignées au swap, cf. swap-request).
  useEffect(() => {
    viewAAnchorY.value = swappedRef.current ? bottomCardTop : topCardInitialY;
    viewBAnchorY.value = swappedRef.current ? topCardInitialY : bottomCardTop;
  }, [bottomCardTop, topCardInitialY]);

  // Cleanup du timeout d'attente d'image au démontage
  useEffect(() => () => {
    if (transitionWaitTimeoutRef.current) clearTimeout(transitionWaitTimeoutRef.current);
  }, []);

  // Garde-fou du slot révélé (voir REVEAL_FALLBACK_MS)
  useEffect(() => {
    if (!revealAbove || !newEvent) return;
    trace('reveal.fallback-armed', { eventId: newEvent.id, timeoutMs: REVEAL_FALLBACK_MS });
    const t = setTimeout(() => {
      trace('reveal.remove', { eventId: newEvent.id, reason: 'image-timeout' });
      // Ré-afficher la vue recyclée (rôle bottom) même sans image chargée.
      const bottomOpacity = swappedRef.current ? viewAOpacity : viewBOpacity;
      bottomOpacity.value = 1;
      setRevealAbove(false);
    }, REVEAL_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [revealAbove, newEvent]);

  // Log l'état courant des cartes (uniquement quand il change, pour éviter le spam)
  useEffect(() => {
    const state = {
      requestedTop: previousEvent?.id ?? null, requestedBottom: newEvent?.id ?? null,
      top: currentTop?.id ?? null, bottom: currentBottom?.id ?? null,
      viewA: { role: swapped ? 'bottom' : 'top', eventId: (swapped ? currentBottom : currentTop)?.id },
      viewB: { role: swapped ? 'top' : 'bottom', eventId: (swapped ? currentTop : currentBottom)?.id },
      transitioning, swapped, revealId: (transitioning || revealAbove) ? newEvent?.id ?? null : null, revealAbove,
      isImageLoaded, showDate, isCorrect, isLevelPaused, isInitialRender,
      triggerLevelEndAnim, level, streak,
      buttons: isImageLoaded && !showDate && !isLevelPaused && !transitioning,
      blockedBy: [!isImageLoaded && 'image', showDate && 'date', isLevelPaused && 'pause', transitioning && 'transition'].filter(Boolean),
      elapsedMs: transitionStartRef.current ? Date.now() - transitionStartRef.current : null,
      width, height, topCardHeight, bottomCardTop, buttonsBottomOffset,
    };
    const sig = JSON.stringify({ ...state, elapsedMs: undefined });
    if (sig !== lastLoggedCardsRef.current) {
      lastLoggedCardsRef.current = sig;
      trace('layout.commit', state);
    }
  }, [previousEvent, newEvent, currentTop, currentBottom, transitioning, swapped, revealAbove,
    isImageLoaded, showDate, isCorrect, isLevelPaused, isInitialRender, triggerLevelEndAnim, level, streak,
    width, height, topCardHeight, bottomCardTop, buttonsBottomOffset]);

  useEffect(() => {
    trace('layout.props-effect', {
      prevId: previousEvent?.id ?? null,
      newId: newEvent?.id ?? null,
      isInitialRender,
      isLevelPaused,
      triggerLevelEndAnim,
      prevNewEventIdRef: prevNewEventIdRef.current,
      wasLevelPaused: wasLevelPausedRef.current,
    });

    if (!newEvent || isInitialRender) {
      if (isInitialRender) {
        trace('layout.reset', { reason: 'initial-render' });
        viewATranslateY.value = 0;
        viewBTranslateY.value = 0;
        viewAScale.value = 1;
        viewBScale.value = 1;
        viewAOpacity.value = 1;
        viewBOpacity.value = 1;
        viewAAnchorY.value = topCardInitialY;
        viewBAnchorY.value = bottomCardTop;
        setSwapped(false);
        setRevealAbove(false);
        setCurrentTop(previousEvent);
        setCurrentBottom(newEvent);
        prevNewEventIdRef.current = newEvent?.id ?? null;
        wasLevelPausedRef.current = isLevelPaused;
      } else {
        trace('layout.skip', { reason: 'no-event' });
      }
      return;
    }

    // Détecter un VRAI changement de niveau:
    // Le niveau était en pause (modal de niveau affiché) et vient d'être dépausé (GO pressé)
    if (wasLevelPausedRef.current && !isLevelPaused) {
      trace('layout.reset', { reason: 'resume-level', level, transitioning });
      wasLevelPausedRef.current = isLevelPaused;

      // Mettre à jour les événements
      setSwapped(false);
      setRevealAbove(false);
      setCurrentTop(previousEvent);
      setCurrentBottom(newEvent);
      prevNewEventIdRef.current = newEvent?.id ?? null;

      // Réinitialiser les positions (opacité à 1 : l'ancien double
      // setValue(0) puis setValue(1) synchrone pouvait rendre une frame noire)
      viewATranslateY.value = 0;
      viewBTranslateY.value = 0;
      viewAScale.value = 1;
      viewBScale.value = 1;
      viewAOpacity.value = 1;
      viewBOpacity.value = 1;
      viewAAnchorY.value = topCardInitialY;
      viewBAnchorY.value = bottomCardTop;



      return;
    }

    // Mettre à jour la ref pour le prochain useEffect
    wasLevelPausedRef.current = isLevelPaused;

    // Animation normale lors de la progression dans le même niveau
    // NE PAS déclencher si le niveau est en pause
    if (newEvent.id !== prevNewEventIdRef.current && !isLevelPaused) {
      trace('transition.request', { eventId: newEvent.id, alreadyTransitioning: transitioning });
      prevNewEventIdRef.current = newEvent.id;
      if (revealReadyRef.current === newEvent.id) {
        animateCards();
      } else {
        // Le slot révélé n'a pas encore chargé l'image du nouvel événement :
        // attendre son onLoad (borné) plutôt que dévoiler une zone vide ou une
        // sous-couche en pleine montée.
        pendingTransitionRef.current = newEvent.id;
        transitionWaitTimeoutRef.current = setTimeout(() => {
          transitionWaitTimeoutRef.current = null;
          if (pendingTransitionRef.current === newEvent.id) {
            pendingTransitionRef.current = null;
            trace('transition.image-wait-timeout', { eventId: newEvent.id, timeoutMs: TRANSITION_IMAGE_WAIT_MS });
            animateCards();
          }
        }, TRANSITION_IMAGE_WAIT_MS);
      }
    } else if (isLevelPaused && newEvent.id !== prevNewEventIdRef.current) {
      trace('transition.deferred', { reason: 'paused', eventId: newEvent.id });
      prevNewEventIdRef.current = newEvent.id;
    } else if (triggerLevelEndAnim && !transitioning) {
      // Animation de validation pour la fin de niveau (sur la carte du bas,
      // c.-à-d. la vue qui a le rôle "bottom" à cet instant)
      const bottomRoleScale = swappedRef.current ? viewAScale : viewBScale;
      trace('level-pulse.start', { view: swappedRef.current ? 'A' : 'B', eventId: currentBottom?.id });

      bottomRoleScale.value = withSequence(
        withTiming(1.1, { duration: 600 }),
        withTiming(1, { duration: 600 }, (finished) => {
          runOnJS(trace)('level-pulse.end', { finished });
        }),
      );
    }
  }, [newEvent, isInitialRender, previousEvent, isLevelPaused, triggerLevelEndAnim]); // Utiliser isLevelPaused au lieu de level

  const onTransitionEnd = (transitionId: number, startedAt: number, finished: boolean) => {
    trace('transition.end', {
      transitionId, finished, elapsedMs: Date.now() - startedAt, triggerLevelEndAnim,
      superseded: transitionId !== transitionIdRef.current,
    });
    // Animation interrompue : ne pas permuter les rôles ni toucher
    // `transitioning`, une nouvelle animation fera le swap.
    if (!finished) return;
    requestAnimationFrame(() => {
      // NE PAS mettre à jour les cartes si c'est l'animation de fin de niveau
      // Cela évite que les deux cartes deviennent similaires pendant la transition
      if (!triggerLevelEndAnim) {
        // Swap par re-ancrage atomique : `top` et `translateY` vivent tous les
        // deux dans le style animé Reanimated → appliqués dans la même file
        // UI-thread → aucun frame intermédiaire incohérent. Après le swap,
        // translateY=0 correspond toujours à la bonne position : tout reset
        // intempestif devient un no-op visuel.
        const nextSwapped = !swappedRef.current;
        trace('transition.swap-request', { transitionId, elapsedMs: Date.now() - startedAt, nextSwapped, swapMethod: 'reanimated-v4' });
        // Masquer la vue sortie AVANT son recyclage (opacity 0, atomique).
        const exitingOpacity = swappedRef.current ? viewBOpacity : viewAOpacity;
        exitingOpacity.value = 0;
        viewAAnchorY.value = nextSwapped ? bottomCardTop : topCardInitialY;
        viewBAnchorY.value = nextSwapped ? topCardInitialY : bottomCardTop;
        viewATranslateY.value = 0;
        viewBTranslateY.value = 0;
        viewAScale.value = 1;
        viewBScale.value = 1;
        setSwapped(nextSwapped);
        setCurrentTop(currentBottom);
        setCurrentBottom(newEvent);
        setRevealAbove(true);
        requestAnimationFrame(() => {
          // Deuxième assertion (invisible : sortie à opacity 0, montée à 0).
          viewATranslateY.value = 0;
          viewBTranslateY.value = 0;
          viewAScale.value = 1;
          viewBScale.value = 1;
          exitingOpacity.value = 0;
          trace('transition.reset-frame', { transitionId, elapsedMs: Date.now() - startedAt });
          setTransitioning(false);
        });
      } else {
        // Fin de niveau - juste réinitialiser l'état de transition
        setTransitioning(false);
        setRevealAbove(false);
      }
    });
  };

  const animateCards = () => {
    const transitionId = ++transitionIdRef.current;
    const startedAt = Date.now();
    transitionStartRef.current = startedAt;
    setTransitioning(true);
    setRevealAbove(false);
    viewAOpacity.value = 1;
    viewBOpacity.value = 1;

    // Rôles courants : la vue de rôle "bottom" monte, celle de rôle "top" sort.
    // swapped=false → A=top, B=bottom ; swapped=true → A=bottom, B=top.
    const risingTranslateY = swapped ? viewATranslateY : viewBTranslateY;
    const exitingTranslateY = swapped ? viewBTranslateY : viewATranslateY;
    const exitingScale = swapped ? viewBScale : viewAScale;
    // Ancres : avec le re-anchoring au swap, la vue de rôle "bottom" est
    // toujours ancrée sur bottomCardTop et celle de rôle "top" sur
    // topCardInitialY — indépendamment de quelle vue physique tient le rôle.
    const risingRestY = bottomCardTop;
    const exitingRestY = topCardInitialY;

    // translateY nécessaire pour placer une vue sur un slot donné :
    // translateY = slotY - restY
    const exitSlotY = topCardInitialY + moveDistance; // au-dessus de l'écran
    const riseTarget = topCardInitialY - risingRestY;
    const exitTarget = exitSlotY - exitingRestY;

    // Utiliser la durée longue si c'est l'animation de fin de niveau
    const duration = triggerLevelEndAnim ? ANIMATION_DURATION_LEVEL_END : ANIMATION_DURATION;
    trace('transition.start', {
      transitionId, top: currentTop?.id, bottom: currentBottom?.id, next: newEvent?.id,
      risingView: swapped ? 'A' : 'B', exitingView: swapped ? 'B' : 'A',
      riseTarget, exitTarget, recycleTarget: 0, duration,
    });

    // Reanimated : transforms appliqués via le pipeline UI-thread — pas de
    // props-node RN, pas de restoreDefaultValues, pas de valeur stale poussée
    // par un commit Fabric. Le swap écrit ancres+translateY dans la même file
    // UI → atomique.
    exitingTranslateY.value = withTiming(exitTarget, { duration });
    exitingScale.value = withTiming(0.95, { duration });
    risingTranslateY.value = withTiming(riseTarget, { duration }, (finished) => {
      runOnJS(onTransitionEnd)(transitionId, startedAt, finished === true);
    });
  };

  // Le slot révélé permanent a chargé l'image du prochain événement : si une
  // transition attendait cette image, on la démarre maintenant.
  const handleRevealImageLoaded = () => {
    const id = newEvent?.id ?? null;
    revealReadyRef.current = id;
    if (id && pendingTransitionRef.current === id) {
      pendingTransitionRef.current = null;
      if (transitionWaitTimeoutRef.current) {
        clearTimeout(transitionWaitTimeoutRef.current);
        transitionWaitTimeoutRef.current = null;
      }
      trace('transition.image-ready', { eventId: id });
      animateCards();
    }
  };

  // La vraie carte du bas a fini de charger la nouvelle image : le slot
  // révélé repasse en dessous après trois frames (le temps que le commit
  // se peint — une frame de marge en plus car le thread JS peut être
  // congestionné en fin de transition).
  const handleBottomImageLoaded = useCallback((eventId?: string) => {
    trace('image.bottom-callback', {
      eventId, expected: newEvent?.id, displayed: currentBottom?.id,
      matchesRequested: eventId === newEvent?.id, revealId: newEvent?.id, revealAbove, transitioning,
    });
    onImageLoad();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          trace('reveal.remove', { reason: 'bottom-image-loaded', eventId, revealId: newEvent?.id });
          // La vue recyclée repasse au premier plan : elle affiche maintenant
          // la bonne image, le recouvrement du slot révélé est invisible.
          const bottomOpacity = swappedRef.current ? viewAOpacity : viewBOpacity;
          bottomOpacity.value = 1;
          setRevealAbove(false);
        });
      });
    });
  }, [newEvent?.id, currentBottom?.id, revealAbove, transitioning, onImageLoad]);

  const handleChoice = (choice: 'avant' | 'après') => {
    trace('buttons.choice', { choice, eventId: currentBottom?.id, requested: newEvent?.id, transitioning, revealAbove });
    onChoice(choice);
  };

  const shouldRenderButtons = isImageLoaded && !showDate && !isLevelPaused && !transitioning;

  // --- CLÉS ET ENFANTS STABLES ---
  // Clés fixes (et non liées à l'ID de l'événement) pour éviter le remount
  // complet des cartes à chaque swap. Les `children` des Animated.View sont
  // aussi figés : voir CardSlotContext — un nouvel élément à chaque render
  // recréait le nœud AnimatedProps et restaurant les valeurs par défaut,
  // ce qui ramenait les cartes à leur position de repos pendant une frame.
  const viewAKey = 'event-card-a';
  const viewBKey = 'event-card-b';
  const cardSlotContext = useMemo<CardSlotContextValue>(() => ({
    swapped,
    currentTop,
    currentBottom,
    newEvent,
    layoutId,
    streak,
    level,
    showDate,
    isCorrect,
    bottomFeedback: bottomFeedbackRef.current,
    onBottomImageLoaded: handleBottomImageLoaded,
  }), [swapped, currentTop, currentBottom, newEvent, layoutId, streak, level, showDate, isCorrect, handleBottomImageLoaded]);
  const viewAChildren = useMemo(() => <CardSlotContent view="A" />, []);
  const viewBChildren = useMemo(() => <CardSlotContent view="B" />, []);
  const viewAAnimStyle = useAnimatedStyle(() => ({
    top: viewAAnchorY.value,
    transform: [
      { translateY: viewATranslateY.value },
      { scale: viewAScale.value },
    ],
    opacity: viewAOpacity.value,
  }));
  const viewBAnimStyle = useAnimatedStyle(() => ({
    top: viewBAnchorY.value,
    transform: [
      { translateY: viewBTranslateY.value },
      { scale: viewBScale.value },
    ],
    opacity: viewBOpacity.value,
  }));
  // --------------------------------

  return (
    <CardSlotContext.Provider value={cardSlotContext}>
    <View style={styles.container}>
      {/* Slot permanent du prochain événement : toujours monté sous la carte
          qui monte (zIndex 0) — masqué par occlusion, pas de délai de mount —
          puis au-dessus après le swap (zIndex 3) le temps que la vraie image
          de la carte du bas charge et soit peinte. */}
      {newEvent && (
        <View
          pointerEvents="none"
          style={[
            styles.cardContainer,
            {
              top: bottomCardTop,
              height: bottomCardHeight,
              // zIndex constant 0 : toujours sous les vues A/B. Le masquage de
              // la vue recyclée se fait via son opacity à 0, pas en montant
              // cette vue au-dessus (changer le zIndex re-parenterait la vue
              // sur Android → frame noire).
              zIndex: 0,
            },
          ]}
        >
          <AnimatedEventCardA
            event={newEvent}
            debugSlot={`${layoutId}:reveal`}
            position="bottom"
            showDate={false}
            streak={streak}
            level={level}
            onImageLoad={handleRevealImageLoaded}
          />
        </View>
      )}

      {/* Vue A : `top` (ancre par rôle), translateY, scale et opacity vivent
          dans le style animé Reanimated → appliqués atomiquement sur le
          thread UI. Zéro props-node RN Animated → aucun restoreDefaultValues
          possible → le snap à l'ancre ne peut plus se produire. */}
      <AnimatedRe.View
        key={viewAKey}
        style={[
          styles.cardContainer,
          {
            height: topCardHeight,
            // zIndex CONSTANT : un changement de zIndex détache/rattache la
            // vue sur Android → elle disparaît quelques frames (flash noir).
            // L'ordre de peinture ne change pas entre les vues : A sous B.
            zIndex: 1,
          },
          viewAAnimStyle,
        ]}
      >
        {viewAChildren}
      </AnimatedRe.View>

      {/* Vue B : idem (rôle "bottom" tant que swapped=false). */}
      <AnimatedRe.View
        key={viewBKey}
        style={[
          styles.cardContainer,
          {
            height: bottomCardHeight,
            // zIndex constant (voir vue A) : B reste au-dessus de A en peinture.
            zIndex: 2,
          },
          viewBAnimStyle,
        ]}
      >
        {viewBChildren}
      </AnimatedRe.View>

      {/* Boutons AVANT/APRÈS : calque fixe au-dessus de tout, jamais déplacé
          ni masqué par les transitions. */}
      <View
        pointerEvents="box-none"
        style={[
          styles.cardContainer,
          styles.buttonsOverlay,
          { top: bottomCardTop, height: bottomCardHeight },
        ]}
      >
        <View style={[styles.buttonsContainer, { bottom: buttonsBottomOffset }]}>
          {shouldRenderButtons && (
            <OverlayChoiceButtonsA
              key={`buttons-${currentBottom?.id ?? 'no-event'}`}
              debugEventId={currentBottom?.id}
              onChoice={handleChoice}
              isLevelPaused={isLevelPaused}
              isWaitingForCountdown={false}
              transitioning={transitioning}
              isTutorialActive={isTutorialActive}
              tutorialStep={tutorialStep}
            />
          )}
        </View>
      </View>
    </View>
    </CardSlotContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
  },
  buttonsOverlay: {
    zIndex: 6,
  },
  bottomCardContent: {
    flex: 1,
    position: 'relative',
  },
  buttonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    zIndex: 3,
    alignItems: 'center',
  },
});

export default EventLayoutA;

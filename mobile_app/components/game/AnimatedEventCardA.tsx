/************************************************************************************
 * 1. COMPOSANT : AnimatedEventCardA
 *
 * 1.A. Description
 *     Composant React Native affichant une carte d'événement animée avec des
 *     fonctionnalités spécifiques selon sa position (haut ou bas).
 *
 * 1.B. Props
 *     @interface AnimatedEventCardAProps
 *     @property {any} event - Données de l'événement à afficher.
 *     @property {'top' | 'bottom'} position - Position de la carte (haut ou bas).
 *     @property {() => void} [onImageLoad] - Callback appelé lorsque l'image est chargée.
 *     @property {boolean} [showDate] - Indique si la date doit être affichée.
 *     @property {boolean} [isCorrect] - Indique si la réponse est correcte.
 *     @property {number} [streak] - Nombre de bonnes réponses consécutives.
 *     @property {number} [level] - Niveau actuel du jeu.
 ************************************************************************************/

// 1.C. Imports
import React, { useEffect, useRef, useState, useId, useMemo, createContext, useContext } from 'react';
import { traceGameRender } from '@/utils/logger';
import { View, Image, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, Linking } from 'react-native';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/supabaseClients';

// Le contenu du bandeau de date passe par ce contexte : props.children de
// l'Animated.View doit garder une identité stable. Sans ça, React Native
// recréait le nœud AnimatedProps à chaque render et restaurait les valeurs
// par défaut (__restoreDefaultValues) → l'opacité du bandeau revenait une
// frame à sa valeur de repos (bandeau qui clignote à chaque render).
const DateBandCtx = createContext<React.ReactNode>(null);
const DateBandSlot: React.FC = () => useContext(DateBandCtx) as React.ReactElement | null;

const ADMIN_EMAIL = 'pierre.cousin7@gmail.com';
const ADMIN_EVENT_EDIT_BASE_URL = 'https://adminweb-ruddy.vercel.app/edit-event';

// Obtenir les dimensions de l'écran pour les calculs de style adaptatif
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isVerySmallScreen = SCREEN_WIDTH < 360 || SCREEN_HEIGHT < 640;

/************************************************************************************
 * 1.D. Interface des Props
 ************************************************************************************/
interface AnimatedEventCardAProps {
  event: any;
  position: 'top' | 'bottom';
  onImageLoad?: () => void;
  showDate?: boolean;
  isCorrect?: boolean;
  streak?: number;
  level?: number;
  debugSlot?: string;
}

/************************************************************************************
 * 1.E. Composant Fonctionnel
 ************************************************************************************/
const AnimatedEventCardA: React.FC<AnimatedEventCardAProps> = ({
  event,
  position,
  onImageLoad,
  showDate = false,
  isCorrect,
  streak,
  level,
  debugSlot,
}) => {
  const cardId = useId();
  const imageStartRef = useRef(0);
  const trace = (action: string, data: Record<string, unknown> = {}) => {
    traceGameRender(action, { cardId, slot: debugSlot, eventId: event?.id, position, ...data });
  };

  useEffect(() => {
    trace('card.mount');
    return () => traceGameRender('card.unmount', { cardId, slot: debugSlot });
  }, []);
  // 1.E.1. Animations et états (Reanimated : un seul canal UI-thread, plus de
  // restauration de valeurs par défaut au milieu des animations)
  const dateScale = useSharedValue(1);
  const fadeAnim = useSharedValue(0);
  const [isTitleLong, setIsTitleLong] = useState(false);

  // État pour adapter la taille du texte en fonction de la longueur du titre
  const [titleFontSize, setTitleFontSize] = useState(position === 'top' ? 24 : 22);

  // Animation pour la couleur du titre
  const titleColorAnim = useSharedValue(0);

  const dateScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dateScale.value }],
  }));
  const dateFadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const titleColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      titleColorAnim.value, [0, 0.5, 1],
      ['rgba(255, 255, 255, 1)', 'rgba(220, 240, 255, 1)', 'rgba(255, 255, 255, 1)']
    ),
    textShadowColor: interpolateColor(
      titleColorAnim.value, [0, 0.5, 1],
      ['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']
    ),
  }));

  // État administrateur pour le bouton d'accès rapide admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpeningAdmin, setIsOpeningAdmin] = useState(false);

  // Garde l'image précédente affichée sous la nouvelle le temps qu'elle charge,
  // pour éviter une frame vide (clignotement) lors du changement d'événement.
  const [prevIllustration, setPrevIllustration] = useState<string | null>(null);
  const lastIllustrationRef = useRef<string | null>(event?.illustration_url ?? null);
  const lastImageEventIdRef = useRef(event?.id);
  const loadedIllustrationRef = useRef<string | null>(null);
  const [lastRenderedUri, setLastRenderedUri] = useState(event?.illustration_url ?? null);

  // Ajustement PENDANT le rendu (pattern officiel React) : l'underlay doit être
  // visible dès le premier commit du nouvel événement. Le faire dans un effet
  // laissait un commit avec la zone image vide (fond noir visible ~130ms).
  const currentUri = event?.illustration_url ?? null;
  if (currentUri !== lastRenderedUri) {
    setPrevIllustration(loadedIllustrationRef.current === currentUri ? null : lastRenderedUri);
    setLastRenderedUri(currentUri);
  }

  useEffect(() => {
    const uri = event?.illustration_url ?? null;
    if (uri !== lastIllustrationRef.current) {
      trace('image.source-change', { previousEventId: lastImageEventIdRef.current, hasImage: Boolean(uri) });
      lastIllustrationRef.current = uri;
    }
    lastImageEventIdRef.current = event?.id;
  }, [event?.illustration_url, event?.id]);

  useEffect(() => {
    trace('card.commit', {
      showDate, isCorrect, hasImage: Boolean(event?.illustration_url),
      underlayVisible: Boolean(prevIllustration), underlayMatchesImage: prevIllustration === event?.illustration_url,
      titleFontSize, isTitleLong, isAdmin,
    });
  }, [event?.id, event?.illustration_url, position, showDate, isCorrect, prevIllustration, titleFontSize, isTitleLong, isAdmin]);

  const handleImageLoaded = () => {
    loadedIllustrationRef.current = event?.illustration_url ?? null;
    trace('image.load', { elapsedMs: imageStartRef.current ? Date.now() - imageStartRef.current : null, hasCallback: Boolean(onImageLoad) });
    setPrevIllustration(null);
    onImageLoad?.();
  };

  // Vérification de l'administrateur
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email?.toLowerCase() === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  // 1.E.4. Fonction pour extraire l'année d'une date
  const getYearFromDate = (dateString: string): string => {
    try {
      // Si c'est déjà une année à 4 chiffres, on la retourne directement
      if (/^\d{4}$/.test(dateString)) return dateString;

      // Si c'est une date formatée "YYYY-MM-DD", on extrait l'année
      if (dateString.includes('-')) return dateString.split('-')[0];

      // Si c'est une date formatée localisée, on tente d'extraire l'année
      if (event.date_formatee) {
        const parts = event.date_formatee.split(' ');
        for (const part of parts) {
          if (/^\d{4}$/.test(part)) return part;
        }
      }

      // Fallback: retour de la chaîne originale
      return dateString;
    } catch (error) {
      console.error('Error extracting year from date:', error);
      return dateString;
    }
  };

  const handleOpenAdminEvent = async () => {
    if (!event?.id) return;
    setIsOpeningAdmin(true);

    const editUrl = `${ADMIN_EVENT_EDIT_BASE_URL}/${event.id}?source=evenements`;

    try {
      const canOpen = await Linking.canOpenURL(editUrl);
      if (!canOpen) {
        throw new Error('Lien admin indisponible');
      }

      await Linking.openURL(editUrl);
      Alert.alert('Admin', 'Page admin ouverte. Tu peux copier le titre depuis le bouton dédié sur la page.');
    } catch (err: any) {
      Alert.alert('Erreur', `Impossible d'ouvrir la page admin : ${err?.message || 'erreur inconnue'}`);
    } finally {
      setIsOpeningAdmin(false);
    }
  };

  // ----------------------------------------


  // 1.E.2. Effet pour l'animation de la date
  useEffect(() => {
    if (position === 'top') {
      fadeAnim.value = 1;
      dateScale.value = 1;
      trace('date.keep-visible');
      return;
    }
    trace('date.effect', { showDate, targetOpacity: showDate ? 1 : 0 });
    if (showDate) {
      // Le bandeau réapparaît en fondu à chaque nouvel événement affiché,
      // pour éviter une apparition instantanée perçue comme un clignotement.
      fadeAnim.value = 0;
      // Animation de pulsation pour la date
      dateScale.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );

      // Animation de fondu pour l'ensemble
      fadeAnim.value = withTiming(1, { duration: 300 });
    } else {
      // Reset de l'animation quand la date est cachée
      fadeAnim.value = 0;
    }
  }, [showDate, position, event?.id]);

  // Animation initiale au chargement pour la carte supérieure
  useEffect(() => {
    if (position === 'top') {
      fadeAnim.value = 1;
    }
  }, [position]);

  // Animation de variation de couleur pour le titre
  useEffect(() => {
    trace('card.title-color-restart');
    // Réinitialiser l'animation à chaque changement d'événement
    titleColorAnim.value = 0;

    // Animation en boucle pour faire varier la couleur du titre
    titleColorAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 20000 }),
        withTiming(0, { duration: 20000 })
      ),
      -1
    );
  }, [event?.id]); // Ajouter event?.id comme dépendance

  // 1.E.3. Vérification et ajustement pour la longueur du titre
  useEffect(() => {
    if (event?.titre) {
      const titleLength = event.titre.length;
      const wordCount = event.titre.split(' ').length;

      // Déterminer si c'est un titre long
      setIsTitleLong(titleLength > 40 || wordCount > 4);

      // Ajuster la taille de police en fonction de la longueur et position
      // Pour les très petits écrans, réduire la taille de police davantage
      const scaleFactor = isVerySmallScreen ? 0.75 : 1;

      if (position === 'top') {
        if (titleLength > 70 || wordCount > 8) {
          setTitleFontSize(Math.round(18 * scaleFactor));
        } else if (titleLength > 50 || wordCount > 6) {
          setTitleFontSize(Math.round(20 * scaleFactor));
        } else if (titleLength > 30 || wordCount > 4) {
          setTitleFontSize(Math.round(22 * scaleFactor));
        } else {
          setTitleFontSize(Math.round(24 * scaleFactor));
        }
      } else {
        // Pour la carte du bas
        if (titleLength > 70 || wordCount > 8) {
          setTitleFontSize(Math.round(16 * scaleFactor));
        } else if (titleLength > 50 || wordCount > 6) {
          setTitleFontSize(Math.round(18 * scaleFactor));
        } else if (titleLength > 30 || wordCount > 4) {
          setTitleFontSize(Math.round(20 * scaleFactor));
        } else {
          setTitleFontSize(Math.round(22 * scaleFactor));
        }
      }
    }
  }, [event?.titre, position]);

  // 1.E.5. Rendu du titre avec ou sans effet d'ombre
  const renderTitle = () => {
    // Titre pour la carte du haut
    if (position === 'top') {
      return (
        <View style={[
          styles.titleContainer,
          styles.titleContainerTop,
          isTitleLong && styles.titleContainerLong,
          showDate && styles.titleContainerWithDate
        ]}>
          <AnimatedRe.Text
            style={[
              styles.title,
              styles.titleTop,
              styles.textOutline,
              { fontSize: titleFontSize },
              titleColorStyle,
            ]}
            numberOfLines={3}
          >
            {event?.titre}
          </AnimatedRe.Text>
        </View>
      );
    }

    // Titre pour la carte du bas avec effet d'ombre amélioré
    return (
      <View style={styles.bottomTitleWrapper}>
        <AnimatedRe.Text
          style={[
            styles.titleBottom,
            styles.textOutline,
            {
              fontSize: titleFontSize,
              fontWeight: 'bold',
              textAlign: 'center',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            },
            titleColorStyle,
          ]}
          numberOfLines={3}
        >
          {event?.titre}
        </AnimatedRe.Text>
      </View>
    );
  };

  // Contenu du bandeau de date, fourni par DateBandCtx : l'élément fils de
  // l'Animated.View reste alors figé entre les renders (DateBandSlot).
  const dateBandSlotEl = useMemo(() => <DateBandSlot />, []);
  const dateBandContent = (
    <>
      {position === 'top' && (
        <View style={styles.separator} />
      )}
      <AnimatedRe.Text
        style={[
          styles.dateText,
          position === 'top' ? styles.topDateText : styles.bottomDateText,
          dateScaleStyle,
        ]}
      >
        {event?.date ? getYearFromDate(event.date) : ''}
      </AnimatedRe.Text>
    </>
  );

  // 1.E.6. Rendu de l'overlay de date
  const renderDate = () => {
    if (!showDate || !event?.date) return null;

    const dateOverlayStyle = [
      styles.dateOverlay,
      position === 'top' ? styles.topDateOverlay : styles.bottomDateOverlay,
      position === 'bottom' && isCorrect !== undefined && (
        isCorrect ? styles.correctOverlay : styles.incorrectOverlay
      )
    ];

    return (
      <AnimatedRe.View style={[dateOverlayStyle, dateFadeStyle]}>
        {dateBandSlotEl}
      </AnimatedRe.View>
    );
  };

  // 1.E.7. Rendu principal du composant
  return (
    <DateBandCtx.Provider value={dateBandContent}>
    <View style={styles.container} onLayout={({ nativeEvent }) => trace('card.layout', { ...nativeEvent.layout })}>
      <View style={styles.cardFrame}>
        <View style={styles.cardContent}>
          {/* Image précédente en sous-couche le temps que la nouvelle charge */}
          {prevIllustration && (
            <Image
              source={{ uri: prevIllustration }}
              style={styles.image}
              resizeMode="cover"
              fadeDuration={0}
            />
          )}
          {/* Image d'arrière-plan */}
          <Image
            source={{ uri: event?.illustration_url }}
            style={styles.image}
            onLoadStart={() => {
              imageStartRef.current = Date.now();
              trace('image.load-start');
            }}
            onLoad={({ nativeEvent }) => {
              trace('image.source-check', { matchesRequested: nativeEvent.source?.uri === event?.illustration_url });
              handleImageLoaded();
            }}
            onLoadEnd={() => trace('image.load-end')}
            onError={({ nativeEvent }) => trace('image.error', {
              elapsedMs: imageStartRef.current ? Date.now() - imageStartRef.current : null,
              error: nativeEvent.error?.replace(/https?:\/\/\S+/g, '[image-url]').slice(0, 300),
            })}
            resizeMode="cover"
            fadeDuration={0}
          />

          {/* Dégradé pour améliorer la lisibilité du texte */}
          <LinearGradient
            colors={position === 'top' ?
              ['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)'] :
              ['transparent', 'transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']
            }
            locations={position === 'top' ? [0.4, 0.7, 1] : [0, 0.6, 0.8, 1]}
            style={[
              styles.gradient,
              position === 'top' ? styles.gradientTop : styles.gradientBottom
            ]}
          >
            {position === 'top' && renderTitle()}
          </LinearGradient>

          {/* Titre pour la carte du bas (placé au-dessus du gradient pour un meilleur contrôle) */}
          {position === 'bottom' && renderTitle()}

          {/* Overlay de date */}
          {renderDate()}

          {/* Bouton Admin : ouvrir l'événement sur admin web + copier le titre */}
          {isAdmin && position === 'bottom' && (
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleOpenAdminEvent}
                  disabled={isOpeningAdmin}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="open-outline" 
                    size={28} 
                    color={isOpeningAdmin ? '#666' : '#FFD700'} 
                  />
                </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
    </DateBandCtx.Provider>
  );
};

/************************************************************************************
 * 1.F. Styles
 ************************************************************************************/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  cardFrame: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)', // un peu plus lumineux
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // fond légèrement plus clair pour effet de lumière
    overflow: 'hidden',
    elevation: 12, // augmenté pour Android
    shadowColor: '#FFD700', // Couleur lumineuse or doux
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, // augmenté pour un glow visible
    shadowRadius: 10, // légèrement augmenté pour l'effet "glow"
  },

  cardContent: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  // Styles pour le dégradé
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  gradientTop: {
    bottom: 0,
    height: '60%', // Augmenté pour couvrir plus d'espace
  },
  gradientBottom: {
    bottom: 0,
    height: '50%', // Augmenté pour la carte du bas
  },

  // Styles pour le conteneur de titre
  titleContainer: {
    padding: 15,
    justifyContent: 'flex-end',
  },
  titleContainerTop: {
    paddingBottom: 20,
  },
  titleContainerLong: {
    paddingBottom: 20,
  },
  titleContainerWithDate: {
    paddingBottom: 80, // Plus grand quand la date est affichée
  },

  // Styles pour le titre
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleTop: {
    letterSpacing: 0.5,
  },

  // Styles pour le contour du texte et l'effet de glow
  textOutline: {
    // Effet de contour multiple avec des ombres dans différentes directions
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    // Le style de base inclut déjà textShadowColor qui est animé

    // On ajoute un effet supplémentaire avec backgroundColor
    backgroundColor: isVerySmallScreen ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: isVerySmallScreen ? 6 : 8,
    paddingVertical: isVerySmallScreen ? 2 : 3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isVerySmallScreen ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)',
  },

  // Styles pour le wrapper du titre du bas
  bottomTitleWrapper: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    zIndex: 100,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Styles pour le titre du bas
  titleBottom: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 0.3,
  },

  // Styles pour l'overlay de date
  dateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  topDateOverlay: {
    height: 80,
  },
  bottomDateOverlay: {
    height: 80,
  },
  correctOverlay: {
    backgroundColor: 'rgba(39, 174, 96, 0.8)',
  },
  incorrectOverlay: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
  },

  // Styles pour le texte de date
  dateText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  topDateText: {
    fontSize: 48,
  },
  bottomDateText: {
    fontSize: 42,
  },

  // Séparateur visuel
  separator: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '80%',
    alignSelf: 'center',
    marginBottom: 10
  },

  // Styles boutons d'action (Signalement & Admin)
  actionButtonsContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  }
});

export default AnimatedEventCardA;
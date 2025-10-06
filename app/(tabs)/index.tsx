// /home/pierre/sword/kiko/app/(tabs)/index.tsx
// Refonte Radicale - Thème Clair, Épuré et Percutant
// ----- FICHIER COMPLET CORRIGÉ (Chemins Relatifs '../../') -----

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase/supabaseClients'; // Chemin relatif vers supabase
import { Audio } from 'expo-av';
import { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useFonts } from '../../hooks/useFonts'; // Chemin relatif vers useFonts
import { FirebaseAnalytics } from '../../lib/firebase'; // Chemin relatif vers firebase
// MODIFIÉ: IS_TEST_BUILD ajouté à l'import
import { getAdUnitId, IS_TEST_BUILD } from '../../lib/config/adConfig'; // Chemin relatif vers adConfig
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// --- PALETTE THÈME CLAIR ---
const COLORS = {
  primary: '#00305A',      // Bleu Nuit (Actions principales, accents forts)
  accentPrimary: '#F5821F',   // Orange Vif (Accents forts, splash?)
  accentSecondary: '#E9967A', // Corail Doux / Saumon (Bouton secondaire)

  // --- Neutres pour Thème Clair ---
  background: '#F8F9FA',     // Blanc Cassé / Gris très clair (Fond principal)
  backgroundCard: '#FFFFFF', // Blanc pur pour les cartes ou éléments surélevés (si besoin)
  textPrimary: '#212529',     // Noir/Gris très foncé (Texte principal)
  textSecondary: '#6C757D',   // Gris moyen (Texte secondaire)
  textOnPrimary: '#FFFFFF',   // Texte Blanc (Sur boutons Bleu Nuit)
  textOnAccent: '#333333',    // Texte Foncé (Sur bouton Corail Doux pour contraste)
  border: '#DEE2E6',          // Gris clair pour bordures discrètes
  borderFocus: '#00305A',     // Bleu Nuit pour bordures actives/focus (ex: ghost button)

  // --- Feedback (inchangé) ---
  success: '#198754', // Vert plus adapté au fond clair
  error: '#DC3545',   // Rouge plus adapté au fond clair
};
// ---------------------------

// --- Splash Fullscreen Constants ---
const SPLASH_TEXT_FADE_DURATION = 600;
const SPLASH_TEXT_DELAY = 200;
const SPLASH_VISIBLE_DURATION = 2600;
const SPLASH_EXIT_DURATION = 450;
const SPLASH_TOTAL_VIEW_DURATION = SPLASH_VISIBLE_DURATION + SPLASH_EXIT_DURATION; // Durée totale visible
const MAIN_CONTENT_ANIM_DURATION = 500;
const SPLASH_COLORS = {
  overlayTop: 'rgba(3, 8, 18, 0.15)',
  overlayBottom: 'rgba(3, 8, 18, 0.75)',
  accent: 'rgba(255, 208, 122, 0.9)',
  textPrimary: '#FFE6B3',
  textSecondary: 'rgba(255, 230, 179, 0.75)',
};
// ---------------------------------------------

// --- Nouveau Splash Screen Animé - Impact sur Fond Clair ---
const AnimatedSplashScreen = ({ onAnimationEnd }) => {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1.08)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const accentWidth = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  const playSplashSound = useCallback(async () => {
    try {
      const playbackVolume = IS_TEST_BUILD ? 0 : 0.18;
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/361261__japanyoshithegamer__8-bit-spaceship-startup.wav'),
        { volume: playbackVolume }
      );
      soundRef.current = sound;
      await soundRef.current.playAsync();
      soundRef.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          soundRef.current?.unloadAsync().catch((unloadError) => {
            console.warn('[Audio] Splash: unload failed', unloadError);
          });
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.warn('Audio playback error:', error);
      console.error('[Audio] Splash: playback error', error);
      FirebaseAnalytics.error('audio_playback_error', error instanceof Error ? error.message : 'Unknown error', 'SplashScreen');
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    playSplashSound();

    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(vignetteOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(accentWidth, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(imageScale, {
        toValue: 1,
        duration: SPLASH_VISIBLE_DURATION + 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(SPLASH_TEXT_DELAY),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: SPLASH_TEXT_FADE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 35,
          friction: 7,
          useNativeDriver: true,
        })
      ])
    ]).start();

    const endTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: SPLASH_EXIT_DURATION,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onAnimationEnd?.();
      });
    }, SPLASH_VISIBLE_DURATION);

    return () => {
      clearTimeout(endTimer);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    };
  }, [playSplashSound, onAnimationEnd]);

  const animatedAccentWidth = accentWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['20%', '72%'],
  });

  return (
    <Animated.View style={[styles.splashContainer, { opacity: containerOpacity }] }>
      <Animated.Image
        source={require('../../assets/images/splash-abbey.png')}
        style={[styles.splashBackground, { opacity: imageOpacity, transform: [{ scale: imageScale }] }]}
        resizeMode="cover"
      />

      <Animated.View style={[styles.splashVignette, { opacity: vignetteOpacity }]}>
        <LinearGradient
          colors={[SPLASH_COLORS.overlayTop, SPLASH_COLORS.overlayBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <Animated.View
        style={[styles.splashAccent, { width: animatedAccentWidth }]}
      />

      <Animated.View style={[
        styles.splashTextContainer,
        {
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }],
        }
      ]}>
        <Text style={styles.splashTitle}>Quandi</Text>
        <Text style={styles.splashSubtitle}>Explorez le Temps</Text>
      </Animated.View>
    </Animated.View>
  );
};
// ----------------------------------

// --- Bouton Repensé - Adapté au Thème Clair ---
const MinimalButton = React.memo(({
  onPress,
  label,
  icon,
  variant = 'primary', // 'primary'(Bleu), 'secondary'(Saumon), 'ghost'(Bordure), 'ghostSecondary'(Bordure Grise)
  disabled = false,
  style = {}
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = (pressed) => {
    Animated.spring(scale, {
      toValue: pressed ? 0.97 : 1,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: COLORS.primary, borderColor: 'transparent', borderWidth: 0 };
      case 'secondary':
        return { backgroundColor: COLORS.accentSecondary, borderColor: 'transparent', borderWidth: 0 };
      case 'ghost':
        return { backgroundColor: 'transparent', borderColor: COLORS.borderFocus, borderWidth: 1.5 };
       case 'ghostSecondary':
         return { backgroundColor: 'transparent', borderColor: COLORS.textSecondary, borderWidth: 1 };
      default:
        return { backgroundColor: COLORS.primary, borderColor: 'transparent', borderWidth: 0 };
    }
  };

  const getTextStyle = () => {
    switch (variant) {
        case 'primary': return { color: COLORS.textOnPrimary };
        case 'secondary': return { color: COLORS.textOnAccent };
        case 'ghost': return { color: COLORS.borderFocus };
        case 'ghostSecondary': return { color: COLORS.textSecondary };
        default: return { color: COLORS.textOnPrimary };
    }
  };

  const getIconColor = () => {
     switch (variant) {
        case 'primary': return COLORS.textOnPrimary;
        case 'secondary': return COLORS.textOnAccent;
        case 'ghost': return COLORS.borderFocus;
        case 'ghostSecondary': return COLORS.textSecondary;
        default: return COLORS.textOnPrimary;
    }
  }

  const buttonStyle = getButtonStyle();

  return (
    <Pressable
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
          styles.buttonWrapper,
          buttonStyle,
          { opacity: disabled ? 0.6 : 1 },
          style,
      ]}
    >
      <Animated.View style={[
        styles.buttonInnerWrapper,
        { transform: [{ scale }] }
      ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={getIconColor()}
            style={styles.buttonIcon}
          />
        )}
        <Text style={[styles.buttonText, getTextStyle()]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});
// --------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(null);
  const fontsLoaded = useFonts(); // Hook pour charger les polices

  // Animation refs pour le contenu principal
  const mainContentAnimation = {
    opacity: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(25)).current
  };

  // Firebase Analytics : Log l'écran une fois les polices chargées et le splash caché
  useEffect(() => {
    if (!showSplash && fontsLoaded) {
      FirebaseAnalytics.screen('Home', 'HomeScreen');
    }
  }, [showSplash, fontsLoaded]);

  // Initialisation : Vérifie l'utilisateur dès que les polices sont prêtes
  useEffect(() => {
    if (fontsLoaded) {
      initializeApp();
    }
  }, [fontsLoaded]);

  const initializeApp = async () => {
    await checkUser();
  };

  // Callback pour masquer le splash et animer le contenu principal
  const handleSplashAnimationEnd = async () => {
    FirebaseAnalytics.logEvent('splash_complete', { time_shown: SPLASH_TOTAL_VIEW_DURATION });
    setShowSplash(false);
    animateMainContentIn();
    // Marquer que le splash a été montré pour cette session
    try {
      await AsyncStorage.setItem('@splash_shown_session', 'true');
    } catch (e) {
      console.warn('Failed to save splash shown state:', e);
    }
  };

  // Animation d'apparition du contenu principal
  const animateMainContentIn = () => {
    Animated.parallel([
      Animated.timing(mainContentAnimation.opacity, {
        toValue: 1,
        duration: MAIN_CONTENT_ANIM_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(mainContentAnimation.translateY, {
        toValue: 0,
        duration: MAIN_CONTENT_ANIM_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // --- Logique Utilisateur & Handlers ---
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
        FirebaseAnalytics.logEvent('user_login', { method: 'auto', is_returning_user: true });
        await FirebaseAnalytics.initialize(session.user.id, false);
      } else {
        await FirebaseAnalytics.initialize(undefined, true);
      }
    } catch (error) {
        console.error("Error checking user session:", error);
        FirebaseAnalytics.error('session_check_error', error instanceof Error ? error.message : 'Unknown error', 'HomeScreen');
        await FirebaseAnalytics.initialize(undefined, true);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single();
        if (error) throw error;
        if (data) {
          setDisplayName(data.display_name);
          FirebaseAnalytics.setUserProperty('display_name', data.display_name);
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        FirebaseAnalytics.error('profile_fetch_error', error instanceof Error ? error.message : 'Unknown error', 'HomeScreen');
    }
  };

  const handleLogout = async () => {
    try {
      FirebaseAnalytics.logEvent('user_logout', { user_type: guestDisplayName ? 'guest' : 'registered' });
      await supabase.auth.signOut();
      setGuestDisplayName(null);
      setDisplayName('');
      setUser(null);
      await FirebaseAnalytics.initialize(undefined, true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      FirebaseAnalytics.error('logout_error', error instanceof Error ? error.message : 'Unknown error', 'HomeScreen');
    }
  };

  const handlePlayAsGuest = () => {
    const guestId = Math.floor(Math.random() * 10000);
    const name = `Explorateur-${guestId}`;
    setGuestDisplayName(name);
    setDisplayName(name); // Met à jour l'affichage localement
    FirebaseAnalytics.logEvent('guest_login', { guest_id: guestId, guest_name: name });
    FirebaseAnalytics.initialize(undefined, true); // Assure le mode anonyme pour Firebase

    Alert.alert(
      'Mode Exploration',
      `Bienvenue, ${name.split('-')[0]} ! En mode exploration, votre progression ne sera pas sauvegardée. Créez un compte pour accéder aux classements et enregistrer vos scores !`,
      [
        {
          text: "Continuer l'exploration",
          onPress: () => {
            FirebaseAnalytics.logEvent('guest_mode_confirmed', { guest_name: name });
            router.push('vue1'); // Navigue vers la vue du jeu
          }
        },
        {
          text: "Créer un compte",
          onPress: () => {
            FirebaseAnalytics.logEvent('guest_to_signup', { from_screen: 'home', guest_name: name });
            router.push('/auth/signup'); // Navigue vers l'inscription
          },
          style: "default"
        }
      ]
    );
  };
  // ------------------------------------

  // --- Handlers Navigation ---
  const handleStartGame = () => {
    FirebaseAnalytics.logEvent('start_game_button_clicked', {
        player_name: guestDisplayName || displayName || 'Anonymous',
        is_guest: !!guestDisplayName,
        user_type: guestDisplayName ? 'guest' : (user ? 'registered' : 'unknown'),
        from_screen: 'home'
    });
    router.push('vue1'); // Navigue vers la vue du jeu
  };

  const handleLoginPress = () => {
    FirebaseAnalytics.logEvent('login_button_clicked', { from_screen: 'home' });
    router.push('/auth/login'); // Navigue vers la page de connexion
  };

  const handleSignupPress = () => {
    FirebaseAnalytics.logEvent('signup_button_clicked', { from_screen: 'home' });
    router.push('/auth/signup'); // Navigue vers la page d'inscription
  };
  // ----------------------------------------------------------

  // Affiche un écran de chargement si les polices ne sont pas prêtes
  if (!fontsLoaded) {
    // Vous pourriez mettre un indicateur de chargement ici si vous le souhaitez
    return <View style={styles.loadingContainer} />;
  }

  return (
    <View style={styles.container}>
      {/* Status bar adaptée au thème clair */}
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {showSplash ? (
        <AnimatedSplashScreen onAnimationEnd={handleSplashAnimationEnd} />
      ) : (
        // Conteneur principal qui apparaît après le splash
        <View style={styles.mainContainer}>
          <Animated.View style={[
            styles.contentContainer,
            {
              opacity: mainContentAnimation.opacity,
              transform: [{ translateY: mainContentAnimation.translateY }]
            }
          ]}>
            

            {/* --- Header --- */}
            <View style={styles.headerContainer}>
              <Text style={styles.welcomeTitle}>
                {(() => {
                  if (guestDisplayName) return `Bonjour ${guestDisplayName.split('-')[0]} !`;
                  if (displayName) return `Bonjour ${displayName} !`;
                  return "Bienvenue sur Quandi";
                })()}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {user || guestDisplayName
                  ? "Prêt à défier le temps ?"
                  : "Connectez-vous ou explorez"}
              </Text>
            </View>

            {/* --- Section Boutons --- */}
            <View style={styles.buttonSection}>
              {(user || guestDisplayName) ? (
                // Si connecté ou en mode invité
                <>
                  <MinimalButton
                    label="Nouvelle Partie"
                    icon="play-outline"
                    onPress={handleStartGame}
                    variant="primary"
                    style={styles.mainActionButton}
                  />
                  <MinimalButton
                    label="Déconnexion"
                    icon="log-out-outline"
                    onPress={handleLogout}
                    variant="ghost"
                  />
                </>
              ) : (
                // Si déconnecté
                <>
                  <MinimalButton
                    label="Se Connecter"
                    icon="log-in-outline"
                    onPress={handleLoginPress}
                    variant="primary"
                  />
                  <MinimalButton
                    label="Créer un Compte"
                    icon="person-add-outline"
                    onPress={handleSignupPress}
                    variant="secondary"
                  />
                   <MinimalButton
                    label="Mode Exploration"
                    icon="compass-outline"
                    onPress={handlePlayAsGuest}
                    variant="ghostSecondary"
                  />
                </>
              )}
            </View>

            {/* --- Bannière Publicitaire --- */}
            <View style={styles.adContainer}>
              <BannerAd
                unitId={getAdUnitId('BANNER_HOME')} // Utilise la fonction pour obtenir l'ID d'annonce
                size={BannerAdSize.BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: true }} // Pour GDPR/CCPA
                onAdLoaded={() => { FirebaseAnalytics.ad('banner', 'loaded', 'home_banner', 0); }}
                onAdFailedToLoad={(error) => {
                   FirebaseAnalytics.ad('banner', 'failed', 'home_banner', 0);
                   FirebaseAnalytics.error('ad_load_failed', `Banner Ad Error: ${error.message} (Code: ${error.code})`, 'HomeScreen');
                   console.warn(`Ad failed to load: ${error.message}`); // Log console pour le dev
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// --- Styles Refondus - Thème Clair ---
const styles = StyleSheet.create({
  // --- Conteneurs Base ---
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Fond Blanc Cassé
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // --- Splash Screen ---
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  splashBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  splashVignette: {
    ...StyleSheet.absoluteFillObject,
  },
  splashAccent: {
    position: 'absolute',
    bottom: height * 0.18,
    height: 1,
    backgroundColor: SPLASH_COLORS.accent,
    borderRadius: 999,
    alignSelf: 'center',
  },
  splashTextContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: height * 0.12,
    width: '100%',
  },
  splashTitle: {
    fontSize: 44,
    fontFamily: 'Montserrat-Bold', // Police personnalisée (doit être chargée)
    color: SPLASH_COLORS.textPrimary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: 15,
    fontFamily: 'Montserrat-Regular', // Police personnalisée (doit être chargée)
    color: SPLASH_COLORS.textSecondary,
  },
  // --- Contenu Principal ---
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? (height > 800 ? 60 : 40) : StatusBar.currentHeight || 40, // Gère la status bar/notch
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'space-between', // Pousse header/boutons vers le haut, pub vers le bas
    paddingBottom: 20, // Espace sous la pub
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: height * 0.06,
    marginBottom: height * 0.1,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: 'Montserrat-Bold', // Police personnalisée
    color: COLORS.textPrimary, // Texte foncé
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 17,
    fontFamily: 'Montserrat-Regular', // Police personnalisée
    color: COLORS.textSecondary, // Texte gris secondaire
    textAlign: 'center',
  },
  // --- Section et Styles des Boutons ---
  buttonSection: {
     width: '100%',
     alignItems: 'center', // Centre les boutons (utiles si leur width n'est pas 100%)
  },
  buttonWrapper: {
    width: '95%', // Légèrement moins que 100% pour l'aération
    maxWidth: 400, // Limite sur écrans larges
    marginVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  buttonInnerWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10, // Espace icône/texte
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold', // Police personnalisée
    textAlign: 'center',
    lineHeight: 20, // Pour l'alignement vertical
  },
  mainActionButton: {
    paddingVertical: 15, // Bouton principal légèrement plus grand
  },
  // --- Publicité ---
  adContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // Pour la bannière standard
    marginTop: 15, // Espace au-dessus
  },
});

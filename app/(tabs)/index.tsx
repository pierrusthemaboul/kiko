// /home/pierre/sword/kiko/app/(tabs)/index.tsx
// Refonte Radicale - Thème Clair, Épuré et Percutant
// ----- FICHIER COMPLET CORRIGÉ (Chemins Relatifs '../../') -----

import React, { useEffect, useState, useRef } from 'react';
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
import { getAdUnitId } from '../../lib/config/adConfig'; // Chemin relatif vers adConfig

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

// --- Constantes d'Animation Splash Repensées ---
const SPLASH_SCALE_DURATION = 700;
const SPLASH_TEXT_FADE_DURATION = 600;
const SPLASH_TEXT_DELAY = 200; // Délai après le logo scale
const SPLASH_EXIT_DURATION = 400;
const SPLASH_TOTAL_VIEW_DURATION = SPLASH_SCALE_DURATION + SPLASH_TEXT_DELAY + SPLASH_TEXT_FADE_DURATION + 800; // Durée totale *visible*;
const MAIN_CONTENT_ANIM_DURATION = 500;
// ---------------------------------------------

// --- Nouveau Splash Screen Animé - Impact sur Fond Clair ---
const AnimatedSplashScreen = ({ onAnimationEnd }) => {
  const logoScale = useRef(new Animated.Value(0.7)).current; // Commence plus petit
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Jouer le son dès le début
    playSplashSound();

    // Séquence d'animation d'entrée
    Animated.sequence([
      // 1. Logo apparaît et "grandit" avec un effet ressort
      Animated.parallel([
          Animated.timing(logoOpacity, {
              toValue: 1,
              duration: SPLASH_SCALE_DURATION * 0.6, // Apparition rapide
              useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
              toValue: 1,
              tension: 40, // Moins tendu pour un effet plus doux
              friction: 5,  // Plus de friction
              useNativeDriver: true,
          }),
      ]),
      // 2. Texte apparaît en fondu après un délai
      Animated.delay(SPLASH_TEXT_DELAY),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: SPLASH_TEXT_FADE_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Planification du fondu de sortie
    const endTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: SPLASH_EXIT_DURATION,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        if (onAnimationEnd) {
          onAnimationEnd();
        }
      });
    }, SPLASH_TOTAL_VIEW_DURATION);

    // Nettoyer le timer si le composant est démonté avant la fin
    return () => clearTimeout(endTimer);

  }, [onAnimationEnd]); // Ne dépend que de onAnimationEnd, ne devrait s'exécuter qu'une fois au montage

    // Fonction pour jouer le son (remise)
    const playSplashSound = async () => {
        let soundObject = null; // Garder une référence pour le déchargement
        try {
          const { sound } = await Audio.Sound.createAsync(
             // --- CHEMIN CORRIGÉ (../../) basé sur l'arborescence fournie ---
             require('../../assets/sounds/361261__japanyoshithegamer__8-bit-spaceship-startup.wav'),
             // -------------------------------------------------------------
             { volume: 0.15 } // Volume ajusté
           );
          soundObject = sound; // Assigner la référence
          await soundObject.playAsync();
          // Optionnel : Décharger le son après lecture pour libérer la mémoire
          soundObject.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              soundObject?.unloadAsync(); // Utilise l'optional chaining au cas où
            }
          });
        } catch (error) {
          console.warn('Audio playback error:', error);
          FirebaseAnalytics.error('audio_playback_error', error instanceof Error ? error.message : 'Unknown error', 'SplashScreen');
          // Assurer le déchargement même en cas d'erreur de lecture (si l'objet a été créé)
          if (soundObject) {
            await soundObject.unloadAsync();
          }
        }
    };


  return (
    // Fond clair pour le splash
    <Animated.View style={[styles.splashContainer, { opacity: containerOpacity }]}>
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          // --- CHEMIN CORRIGÉ (../../) basé sur l'arborescence fournie ---
          source={require('../../assets/images/logo3.png')}
          // -------------------------------------------------------------
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={[
          styles.splashTextContainer,
          { opacity: textOpacity } // Simple fondu pour le texte
      ]}>
        {/* Titre en Orange pour l'impact sur fond clair */}
        <Text style={styles.splashTitle}>Quandi</Text>
        {/* Sous-titre en gris secondaire */}
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
  const handleSplashAnimationEnd = () => {
    FirebaseAnalytics.logEvent('splash_complete', { time_shown: SPLASH_TOTAL_VIEW_DURATION });
    setShowSplash(false);
    animateMainContentIn();
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
    backgroundColor: COLORS.background, // Fond clair
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Au-dessus du contenu
  },
  splashLogo: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 25,
  },
  splashTextContainer: {
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 52,
    fontFamily: 'Montserrat-Bold', // Police personnalisée (doit être chargée)
    color: COLORS.accentPrimary, // Orange Vif
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular', // Police personnalisée (doit être chargée)
    color: COLORS.textSecondary, // Gris secondaire
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
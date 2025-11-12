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
  Modal,
  Pressable,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase/supabaseClients'; // Chemin relatif vers supabase
import { User } from '@supabase/supabase-js';
import { useAudioContext } from '../../contexts/AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useFonts } from '../../hooks/useFonts'; // Chemin relatif vers useFonts
import { useAdConsent } from '../../hooks/useAdConsent';
import { FirebaseAnalytics } from '../../lib/firebase'; // Chemin relatif vers firebase
// MODIFIÉ: IS_TEST_BUILD ajouté à l'import
import { getAdRequestOptions, getAdUnitId, IS_TEST_BUILD } from '../../lib/config/adConfig'; // Chemin relatif vers adConfig
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

  const { playSound, isReady } = useAudioContext();

  const playSplashSound = useCallback(async () => {
    if (!isReady) {
      console.log('[Audio] Splash: WebView not ready yet');
      return;
    }
    console.log('[Audio] Splash: Playing splash sound');
    playSound('splash');
  }, [isReady, playSound]);

  useEffect(() => {
    // Play splash sound immediately at the start
    const timer = setTimeout(() => {
      playSplashSound();
    }, 0);

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
      clearTimeout(timer);
      clearTimeout(endTimer);
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
        <Text style={styles.splashTitle}>Timalaus</Text>
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
  const {
    resetConsent,
    isLoading: consentLoading,
    consentStatusLabel,
  } = useAdConsent();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'root' | 'privacy'>('root');

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
    FirebaseAnalytics.trackEvent('splash_complete', {
      time_shown: SPLASH_TOTAL_VIEW_DURATION,
      screen: 'home',
    });
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
        FirebaseAnalytics.trackEvent('user_login', {
          method: 'auto',
          is_returning_user: true,
          screen: 'home',
        });
        await FirebaseAnalytics.initialize(session.user.id, false);
      } else {
        await FirebaseAnalytics.initialize(undefined, true);
      }
    } catch (error) {
        console.error("Error checking user session:", error);
        FirebaseAnalytics.trackError('session_check_error', {
          message: error instanceof Error ? error.message : 'Unknown error',
          screen: 'HomeScreen',
        });
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
          FirebaseAnalytics.setUserProps({ display_name: data.display_name });
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        FirebaseAnalytics.trackError('profile_fetch_error', {
          message: error instanceof Error ? error.message : 'Unknown error',
          screen: 'HomeScreen',
        });
    }
  };

  const handleLogout = async () => {
    try {
      FirebaseAnalytics.trackEvent('user_logout', {
        user_type: guestDisplayName ? 'guest' : 'registered',
        screen: 'home',
      });
      await supabase.auth.signOut();
      setGuestDisplayName(null);
      setDisplayName('');
      setUser(null);
      await FirebaseAnalytics.initialize(undefined, true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      FirebaseAnalytics.trackError('logout_error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        screen: 'HomeScreen',
      });
    }
  };

  const handlePlayAsGuest = () => {
    const guestId = Math.floor(Math.random() * 10000);
    const name = `Explorateur-${guestId}`;
    setGuestDisplayName(name);
    setDisplayName(name); // Met à jour l'affichage localement
    FirebaseAnalytics.trackEvent('guest_login', {
      guest_id: guestId,
      guest_name: name,
      screen: 'home',
    });
    FirebaseAnalytics.initialize(undefined, true); // Assure le mode anonyme pour Firebase

    Alert.alert(
      'Mode Exploration',
      `Bienvenue, ${name.split('-')[0]} ! En mode exploration, votre progression ne sera pas sauvegardée. Créez un compte pour accéder aux classements et enregistrer vos scores !`,
      [
        {
          text: "Continuer l'exploration",
          onPress: () => {
            FirebaseAnalytics.trackEvent('guest_mode_confirmed', {
              guest_name: name,
              screen: 'home',
            });
            router.push('vue1'); // Navigue vers la vue du jeu
          }
        },
        {
          text: "Créer un compte",
          onPress: () => {
            FirebaseAnalytics.trackEvent('guest_to_signup', {
              from_screen: 'home',
              guest_name: name,
            });
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
    FirebaseAnalytics.trackEvent('start_game_button_clicked', {
        player_name: guestDisplayName || displayName || 'Anonymous',
        is_guest: !!guestDisplayName,
        user_type: guestDisplayName ? 'guest' : (user ? 'registered' : 'unknown'),
        from_screen: 'home'
    });
    router.push('vue1'); // Navigue vers la vue du jeu
  };

  const handleLoginPress = () => {
    FirebaseAnalytics.trackEvent('login_button_clicked', { from_screen: 'home' });
    router.push('/auth/login'); // Navigue vers la page de connexion
  };

  const handleSignupPress = () => {
    FirebaseAnalytics.trackEvent('signup_button_clicked', { from_screen: 'home' });
   router.push('/auth/signup'); // Navigue vers la page d'inscription
  };
  // ----------------------------------------------------------

  const handleOpenSettings = useCallback(() => {
    setSettingsSection('root');
    setSettingsVisible(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsVisible(false);
    setSettingsSection('root');
  }, []);

  const handleOpenPrivacySection = useCallback(() => {
    setSettingsSection('privacy');
  }, []);

  const handleManageConsent = useCallback(async () => {
    FirebaseAnalytics.trackEvent('consent_manage_clicked', {
      from_screen: 'home',
      section: 'privacy',
      consent_status: consentStatusLabel ?? 'unknown',
    });
    handleCloseSettings();
    try {
      await resetConsent();
    } catch (err) {
      console.error('[Settings] Failed to manage consent', err);
      Alert.alert(
        'Erreur',
        "Impossible de mettre à jour votre consentement pour le moment. Réessayez plus tard.",
      );
      setSettingsSection('privacy');
      setSettingsVisible(true);
    }
  }, [consentStatusLabel, handleCloseSettings, resetConsent]);

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
                  return "Bienvenue sur Timalaus";
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
                  <MinimalButton
                    label="Paramètres"
                    icon="settings-outline"
                    onPress={handleOpenSettings}
                    variant="ghostSecondary"
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
                  <MinimalButton
                    label="Paramètres"
                    icon="settings-outline"
                    onPress={handleOpenSettings}
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
                requestOptions={getAdRequestOptions()}
                onAdLoaded={() => { FirebaseAnalytics.ad('banner', 'loaded', 'home_banner', 0); }}
                onAdFailedToLoad={(error) => {
                   FirebaseAnalytics.ad('banner', 'failed', 'home_banner', 0);
                   FirebaseAnalytics.trackError('ad_load_failed', {
                     message: `Banner Ad Error: ${error.message} (Code: ${error.code})`,
                     screen: 'HomeScreen',
                     severity: 'warning',
                   });
                   console.warn(`Ad failed to load: ${error.message}`);
                }}
              />
            </View>
          </Animated.View>
        </View>
      )}
      <Modal
        transparent
        animationType="slide"
        visible={settingsVisible}
        onRequestClose={handleCloseSettings}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {settingsSection === 'root' ? (
              <>
                <Text style={styles.modalTitle}>Paramètres</Text>
                <Pressable style={styles.modalItem} onPress={handleOpenPrivacySection}>
                  <View style={styles.modalItemContent}>
                    <Text style={styles.modalItemText}>Confidentialité</Text>
                    <Text style={styles.modalItemSubText}>Publicités et gestion du consentement</Text>
                  </View>
                  <Ionicons name="chevron-forward-outline" size={18} color={COLORS.textSecondary} />
                </Pressable>
                <Pressable style={styles.modalCloseButton} onPress={handleCloseSettings}>
                  <Text style={styles.modalCloseText}>Fermer</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Pressable
                    style={styles.modalIconButton}
                    onPress={() => setSettingsSection('root')}
                  >
                    <Ionicons name="chevron-back-outline" size={18} color={COLORS.textSecondary} />
                  </Pressable>
                  <Text style={styles.modalTitle}>Confidentialité</Text>
                  <View style={styles.modalIconPlaceholder} />
                </View>
                <Text style={styles.modalDescription}>
                  Réinitialisez vos préférences publicitaires et relancez le formulaire de consentement.
                </Text>
                <Text style={styles.modalStatus}>
                  Statut actuel : {consentStatusLabel ?? 'inconnu'}
                </Text>
                <Pressable
                  style={[
                    styles.modalActionButton,
                    consentLoading && styles.modalActionButtonDisabled,
                  ]}
                  onPress={handleManageConsent}
                  disabled={consentLoading}
                >
                  <Text style={styles.modalActionText}>
                    {consentLoading ? 'Chargement…' : 'Gérer mon consentement'}
                  </Text>
                  {!consentLoading && (
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={COLORS.textOnPrimary}
                      style={styles.modalActionIcon}
                    />
                  )}
                </Pressable>
                <Pressable style={styles.modalCloseButton} onPress={handleCloseSettings}>
                  <Text style={styles.modalCloseText}>Fermer</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  modalItemContent: {
    flex: 1,
    marginRight: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    color: COLORS.textPrimary,
  },
  modalItemSubText: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalIconButton: {
    padding: 8,
  },
  modalIconPlaceholder: {
    width: 34,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  modalStatus: {
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalActionButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  modalActionText: {
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
    color: COLORS.textOnPrimary,
  },
  modalActionIcon: {
    marginLeft: 8,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  modalCloseText: {
    fontSize: 15,
    fontFamily: 'Montserrat-Medium',
    color: COLORS.textSecondary,
  },
});

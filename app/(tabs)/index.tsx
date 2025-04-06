// /home/pierre/sword/kiko/app/(tabs)/index.tsx

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
  Pressable, // Assurez-vous que Pressable est importé
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase/supabaseClients';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useFonts } from '../../hooks/useFonts';
// Import corrigé pour utiliser l'objet exporté
import { FirebaseAnalytics } from '../../lib/firebase'; // <- Chemin vérifié
// Import de la configuration des annonces
import { getAdUnitId } from '../../lib/config/adConfig';

// PAS D'IMPORT DIRECT DE analytics ici:
// import analytics from '@react-native-firebase/analytics'; // <-- S'assurer que cette ligne est supprimée ou commentée

const { width, height } = Dimensions.get('window');

// Animation constants
const SPLASH_DURATION = 3000;
const ANIMATION_DURATION = 800;

// Theme configuration (Identique)
const THEME = {
  primary: '#050B1F',    // Très sombre Navy Blue
  secondary: '#0A173D',  // Navy Blue profond
  accent: '#FFCC00',     // Or Métallique
  text: '#FFFFFF',
  background: {
    dark: '#020817',     // Presque noir avec une teinte bleue
    medium: '#050B1F',   // Très sombre
    light: '#0A173D'     // Navy Blue profond
  },
  button: {
    primary: ['#1D5F9E', '#0A173D'],    // Gradient Blue to Dark
    secondary: ['#FFBF00', '#CC9900'],   // Gradient Gold to Dark Gold
    tertiary: ['#0A173D', '#1D5F9E']     // Dark to Blue
  }
};

// SplashLogo (Identique)
const SplashLogo = () => {
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 20,
        friction: 8,
        useNativeDriver: true
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotation, {
            toValue: 1,
            duration: 20000,
            easing: Easing.linear,
            useNativeDriver: true
          }),
          Animated.timing(rotation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      )
    ]).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <Animated.View style={{
      transform: [
        { scale },
        { rotate: spin }
      ]
    }}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.splashLogo}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

// AnimatedButton (Identique, simplifié)
const AnimatedButton = React.memo(({
  onPress,
  label,
  icon,
  variant = 'primary',
  disabled = false,
  style = {}
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animatePress = (pressed) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? 0.95 : 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true
      }),
      Animated.spring(translateY, {
        toValue: pressed ? 2 : 0,
        tension: 100,
        friction: 5,
        useNativeDriver: true
      })
    ]).start();
  };

  const getGradientColors = () => {
    switch (variant) {
      case 'primary': return THEME.button.primary;
      case 'secondary': return THEME.button.secondary;
      default: return THEME.button.tertiary;
    }
  };

  return (
    <Pressable
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      onPress={onPress}
      disabled={disabled}
    >
      <Animated.View style={[
        styles.buttonWrapper,
        {
          transform: [
            { scale },
            { translateY }
          ],
          opacity: disabled ? 0.6 : 1
        },
        style
      ]}>
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonContainer}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={24}
              color="white"
              style={styles.buttonIcon}
            />
          )}
          <Text style={styles.buttonText}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(null);
  const fontsLoaded = useFonts();

  // Animation refs (Identiques)
  const splashAnimation = {
    opacity: useRef(new Animated.Value(1)).current,
    scale: useRef(new Animated.Value(1)).current
  };
  const mainContentAnimation = {
    opacity: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(50)).current
  };

  // Firebase Analytics - track screen view
  useEffect(() => {
    if (!showSplash) {
      FirebaseAnalytics.screen('Home', 'HomeScreen');
    }
  }, [showSplash]);

  // Initialisation quand les polices sont chargées
  useEffect(() => {
    if (fontsLoaded) {
      initializeApp();
    }
  }, [fontsLoaded]);

  const initializeApp = async () => {
    await checkUser();
    startSplashSequence();
  };

  const startSplashSequence = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/361261__japanyoshithegamer__8-bit-spaceship-startup.wav'),
        { volume: 0.2 }
      );
      await sound.playAsync();
    } catch (error) {
      console.warn('Audio playback error:', error);
    }

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(splashAnimation.opacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(splashAnimation.scale, {
          toValue: 1.2,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start(() => {
        // --- APPEL CORRIGÉ ---
        FirebaseAnalytics.logEvent('splash_complete', {
           time_shown: SPLASH_DURATION
        });
        // --------------------
        setShowSplash(false);
        animateMainContent();
      });
    }, SPLASH_DURATION);
  };

  const animateMainContent = () => {
    Animated.parallel([
      Animated.spring(mainContentAnimation.opacity, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true
      }),
      Animated.spring(mainContentAnimation.translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);

        // --- APPEL CORRIGÉ ---
        FirebaseAnalytics.logEvent('user_login', {
          method: 'auto',
          is_returning_user: true
        });
        // --------------------
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
          // --- APPEL CORRIGÉ ---
          FirebaseAnalytics.setUserProperty('display_name', data.display_name);
          // --------------------
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        FirebaseAnalytics.error('profile_fetch_error', error instanceof Error ? error.message : 'Unknown error', 'HomeScreen');
    }
  };

  const handleLogout = async () => {
    try {
      // --- APPEL CORRIGÉ ---
      FirebaseAnalytics.logEvent('user_logout', {
        user_type: guestDisplayName ? 'guest' : 'registered'
      });
      // --------------------

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
    const name = `Voyageur-${guestId}`;

    setGuestDisplayName(name);
    setDisplayName(name);

    // --- APPEL CORRIGÉ ---
    FirebaseAnalytics.logEvent('guest_login', {
      guest_id: guestId,
      guest_name: name
    });
    // --------------------
    FirebaseAnalytics.initialize(undefined, true);

    Alert.alert(
      'Mode Découverte',
      `Bienvenue, ${name} ! En mode découverte, votre progression ne sera pas sauvegardée. Créez un compte pour participer aux classements et garder vos scores !`,
      [
        {
          text: "Continuer en mode découverte",
          onPress: () => {
            // --- APPEL CORRIGÉ ---
            FirebaseAnalytics.logEvent('guest_mode_confirmed', {
              guest_name: name
            });
            // --------------------
          }
        },
        {
          text: "Créer un compte",
          onPress: () => {
            // --- APPEL CORRIGÉ ---
            FirebaseAnalytics.logEvent('guest_to_signup', {
              from_screen: 'home',
              guest_name: name
            });
            // --------------------
            router.push('/auth/signup');
          },
          style: "default"
        }
      ]
    );
  };

  // --- Handlers spécifiques pour les boutons AVEC tracking ---
  const handleStartGame = () => {
    // --- APPEL CORRIGÉ ---
    FirebaseAnalytics.logEvent('start_game_button_clicked', {
        player_name: guestDisplayName || displayName || 'Anonymous',
        is_guest: !!guestDisplayName,
        user_type: guestDisplayName ? 'guest' : (user ? 'registered' : 'unknown'),
        from_screen: 'home'
    });
    // --------------------
    router.push('vue1');
  };

  const handleLoginPress = () => {
    // --- APPEL CORRIGÉ ---
    FirebaseAnalytics.logEvent('login_button_clicked', {
      from_screen: 'home'
    });
    // --------------------
    router.push('/auth/login');
  };

  const handleSignupPress = () => {
    // --- APPEL CORRIGÉ ---
    FirebaseAnalytics.logEvent('signup_button_clicked', {
      from_screen: 'home'
    });
    // --------------------
    router.push('/auth/signup');
  };
  // ---------------------------------------------------------

  if (!fontsLoaded) {
    return null; // Ou un loader simple
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {showSplash ? (
        // Splash Screen JSX (Identique)
        <Animated.View style={[
          styles.splashContainer,
          {
            opacity: splashAnimation.opacity,
            transform: [{ scale: splashAnimation.scale }]
          }
        ]}>
          <LinearGradient
            colors={[THEME.background.dark, THEME.background.medium, THEME.background.light]}
            locations={[0, 0.5, 1]}
            style={styles.splashGradient}
          >
            <View style={styles.vignetteEffect}>
              <SplashLogo />
              <View style={styles.splashTextContainer}>
                <Text style={styles.splashTitle}>ChronoLeap</Text>
                <Text style={styles.splashSubtitle}>Explorez le Temps</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        // Main Content JSX
        <LinearGradient
          colors={[THEME.background.dark, THEME.background.medium]}
          style={styles.mainContainer}
        >
          <Animated.View style={[
            styles.contentContainer,
            {
              opacity: mainContentAnimation.opacity,
              transform: [{ translateY: mainContentAnimation.translateY }]
            }
          ]}>
            <View style={styles.headerContainer}>
              <Text style={styles.welcomeTitle}>
                {(() => {
                  if (guestDisplayName) return `Bienvenue, ${guestDisplayName}`;
                  if (displayName) return `Bienvenue, ${displayName}`;
                  if (user) return `Bienvenue`;
                  return "L'Histoire vous Attend";
                })()}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {user || guestDisplayName
                  ? "Prêt pour votre prochaine aventure ?"
                  : "Embarquez pour un voyage fascinant"}
              </Text>
            </View>

            {/* Utilisation des handlers spécifiques */}
            {(user || guestDisplayName) ? (
              <>
                <AnimatedButton
                  label="Commencer l'Aventure"
                  icon="rocket-outline"
                  onPress={handleStartGame}
                  variant="primary"
                />
                <AnimatedButton
                  label="Déconnexion"
                  icon="log-out-outline"
                  onPress={handleLogout}
                  variant="secondary"
                />
              </>
            ) : (
              <>
                <AnimatedButton
                  label="Se Connecter"
                  icon="log-in-outline"
                  onPress={handleLoginPress}
                  variant="primary"
                />
                <AnimatedButton
                  label="Créer un Compte"
                  icon="person-add-outline"
                  onPress={handleSignupPress}
                  variant="secondary"
                />
                <AnimatedButton
                  label="Mode Découverte"
                  icon="compass-outline"
                  onPress={handlePlayAsGuest}
                  variant="tertiary"
                />
              </>
            )}

            {/* Bannière publicitaire avec adConfig */}
            <View style={styles.adContainer}>
              <BannerAd
                unitId={getAdUnitId('BANNER_HOME')}
                size={BannerAdSize.BANNER}
                requestOptions={{
                  requestNonPersonalizedAdsOnly: true,
                }}
                onAdLoaded={() => {
                  FirebaseAnalytics.ad('banner', 'loaded', 'home_banner', 0);
                }}
                onAdFailedToLoad={(error) => {
                   FirebaseAnalytics.ad('banner', 'failed', 'home_banner', 0);
                   FirebaseAnalytics.error(
                      'ad_load_failed',
                      `Banner Ad Error: ${error.message} (Code: ${error.code})`,
                      'HomeScreen'
                   );
                }}
              />
            </View>
          </Animated.View>
        </LinearGradient>
      )}
    </View>
  );
}

// Styles (Identiques)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background.dark,
  },
  vignetteEffect: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 100,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.background.dark,
  },
  splashGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  splashLogo: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 30,
  },
  splashTextContainer: {
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 42,
    fontFamily: 'Montserrat-Bold',
    color: THEME.accent, // Or Métallique pour ChronoLeap
    letterSpacing: 2,
    marginBottom: 10,
    textShadowColor: 'rgba(255, 191, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  splashSubtitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    color: THEME.text,
    opacity: 0.9,
    textShadowColor: 'rgba(30, 166, 232, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  mainContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeTitle: {
    fontSize: 32,
    fontFamily: 'Montserrat-Bold',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    color: THEME.text,
    opacity: 0.8,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginVertical: 10,
    width: width * 0.85,
    alignSelf: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: THEME.text,
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 20, // Espace pour la bannière
  },
});
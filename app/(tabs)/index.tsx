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
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase/supabaseClients';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from '@supabase/supabase-js';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useFonts } from '../../hooks/useFonts';

const { width, height } = Dimensions.get('window');

// Animation constants
const SPLASH_DURATION = 3000;
const ANIMATION_DURATION = 800;

// Theme configuration
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

  // Animation refs
  const splashAnimation = {
    opacity: useRef(new Animated.Value(1)).current,
    scale: useRef(new Animated.Value(1)).current
  };

  const mainContentAnimation = {
    opacity: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(50)).current
  };

  // Sélection de l'ID de test approprié selon la plateforme
  const adUnitId = Platform.select({
    android: TestIds.BANNER,
    ios: TestIds.BANNER,
    default: TestIds.BANNER,
  });

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
        require('../../assets/sounds/countdown.wav'),
        { volume: 0.2 }
      );
      await sound.playAsync();
    } catch (error) {
      // Gestion des erreurs audio si nécessaire
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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchUserProfile(session.user.id);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();
      
    if (data) setDisplayName(data.display_name);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setGuestDisplayName(null);
      setDisplayName('');
      setUser(null);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const handlePlayAsGuest = () => {
    const guestId = Math.floor(Math.random() * 10000);
    const name = `Voyageur-${guestId}`;
    
    setGuestDisplayName(name);
    setDisplayName(name);
    
    Alert.alert(
      'Mode Découverte', 
      `Bienvenue, ${name} ! En mode découverte, votre progression ne sera pas sauvegardée. Créez un compte pour participer aux classements et garder vos scores !`,
      [
        { text: "Continuer en mode découverte" },
        { 
          text: "Créer un compte", 
          onPress: () => router.push('/auth/signup'),
          style: "default"
        }
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {showSplash ? (
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
                  if (guestDisplayName) {
                    return `Bienvenue, ${guestDisplayName}`;
                  }
                  if (user?.name || displayName) {
                    return `Bienvenue, ${user?.name || displayName}`;
                  }
                  return "L'Histoire vous Attend";
                })()}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {user || guestDisplayName
                  ? "Prêt pour votre prochaine aventure ?"
                  : "Embarquez pour un voyage fascinant"}
              </Text>
            </View>

            {(user || guestDisplayName) ? (
              <>
                <AnimatedButton
                  label="Commencer l'Aventure"
                  icon="rocket-outline"
                  onPress={() => router.push('vue1')}
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
                  onPress={() => router.push('/auth/login')}
                  variant="primary"
                />
                <AnimatedButton
                  label="Créer un Compte"
                  icon="person-add-outline"
                  onPress={() => router.push('/auth/signup')}
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

            {/* Bannière publicitaire en bas */}
            <View style={styles.adContainer}>
              <BannerAd
                unitId={adUnitId}
                size={BannerAdSize.BANNER}
                requestOptions={{
                  requestNonPersonalizedAdsOnly: true,
                }}
              />
            </View>
          </Animated.View>
        </LinearGradient>
      )}
    </View>
  );
}

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
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
  },
});
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

const { width, height } = Dimensions.get('window');

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
  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(null);

  // Animation refs
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
    checkUser();
    animateMainContent();
  }, []);

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
    Alert.alert(
      'Mode Découverte', 
      `Bienvenue, ${name} ! En mode découverte, votre progression ne sera pas sauvegardée.`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

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
              {guestDisplayName || displayName 
                ? `Bienvenue, ${guestDisplayName || displayName}`
                : "L'Histoire vous Attend"}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {(user || guestDisplayName)
                ? "Prêt pour votre prochaine aventure ?"
                : "Embarquez pour un voyage fascinant"}
            </Text>
          </View>

          {(user || guestDisplayName) ? (
            <>
              <AnimatedButton
                label="Commencer l'Aventure"
                icon="rocket-outline"
                onPress={() => router.push('/vue1')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background.dark,
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
    width: '100%',
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
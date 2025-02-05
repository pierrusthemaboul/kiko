import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAdminStatus from '@/hooks/useAdminStatus';
import { useFonts } from '@/hooks/useFonts';

const { width } = Dimensions.get('window');

// Theme qui correspond à l'index
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

// Composant du timeline animé
const AnimatedTimeline = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in initial
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animation de pulsation continue
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de la flèche
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.timelineContainer, { opacity: opacityAnim }]}>
      <View style={styles.timelineLine} />
      
      {/* Événement de référence */}
      <Animated.View style={[styles.eventContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.eventIcon}>
          <Ionicons name="flag" size={24} color={THEME.accent} />
        </View>
        <Text style={styles.eventText}>Événement de référence</Text>
      </Animated.View>

      {/* Choix et nouvel événement */}
      <Animated.View style={[styles.eventContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.choiceButtons}>
          <TouchableOpacity style={styles.choiceButton}>
            <Ionicons name="arrow-back" size={20} color={THEME.accent} />
            <Text style={styles.choiceText}>AVANT</Text>
          </TouchableOpacity>

          <View style={styles.eventIcon}>
            <Ionicons name="help" size={24} color={THEME.accent} />
          </View>

          <TouchableOpacity style={styles.choiceButton}>
            <Text style={styles.choiceText}>APRÈS</Text>
            <Ionicons name="arrow-forward" size={20} color={THEME.accent} />
          </TouchableOpacity>
        </View>
        <Text style={styles.eventText}>Nouvel événement</Text>
      </Animated.View>
    </Animated.View>
  );
};

// Composant du bouton animé
const AnimatedButton = ({ 
  onPress, 
  label, 
  icon, 
  variant = "primary",
  disabled = false 
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true
    }).start();
  };

  const getGradientColors = () => {
    switch(variant) {
      case "secondary":
        return THEME.button.secondary;
      case "tertiary":
        return THEME.button.tertiary;
      default:
        return THEME.button.primary;
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={styles.buttonWrapper}
    >
      <Animated.View style={[
        styles.buttonContainer,
        { transform: [{ scale }] }
      ]}>
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          {icon && <Ionicons name={icon} size={24} color={THEME.accent} style={styles.buttonIcon} />}
          <Text style={styles.buttonText}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function Vue1() {
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const fontsLoaded = useFonts();
  
  // Animations d'entrée
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <LinearGradient
        colors={[THEME.background.dark, THEME.background.medium, THEME.background.light]}
        style={styles.container}
      >
        {/* Header avec boutons admin */}
        {isAdmin && (
          <View style={styles.header}>
            <AnimatedButton
              icon="images-outline"
              label="Images"
              onPress={() => router.push('/vue4')}
              variant="tertiary"
            />
            <AnimatedButton
              icon="settings-outline"
              label="Admin"
              onPress={() => router.push('/vue5')}
              variant="tertiary"
            />
          </View>
        )}

        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <Text style={styles.title}>Comment jouer ?</Text>
          <Text style={styles.subtitle}>
            Testez vos connaissances historiques en replaçant les événements dans leur contexte temporel
          </Text>

          {/* Timeline explicative */}
          <AnimatedTimeline />

          {/* Bouton de démarrage */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/vue2a')}
          >
            <LinearGradient
              colors={THEME.button.secondary}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>COMMENCER</Text>
              <Ionicons name="arrow-forward" size={24} color={THEME.text} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background.dark,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    justifyContent: 'center', // Centrer verticalement le contenu restant
  },
  title: {
    fontSize: 32,
    fontFamily: 'Montserrat-Bold',
    color: THEME.accent,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: `${THEME.accent}40`,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: THEME.text,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 40,
  },
  timelineContainer: {
    width: '100%',
    paddingVertical: 40,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: '50%',
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: THEME.accent,
    opacity: 0.3,
  },
  eventContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  eventIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${THEME.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${THEME.accent}50`,
    marginBottom: 10,
  },
  eventText: {
    color: THEME.text,
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    textAlign: 'center',
  },
  choiceButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${THEME.accent}10`,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${THEME.accent}30`,
  },
  choiceText: {
    color: THEME.accent,
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginHorizontal: 5,
  },
  startButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    gap: 10,
  },
  startButtonText: {
    color: THEME.text,
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
  buttonWrapper: {
    marginVertical: 10,
  },
  buttonContainer: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: THEME.text,
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
});

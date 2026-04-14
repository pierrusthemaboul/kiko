import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import { COLORS } from '../constants';

const { width, height } = Dimensions.get('window');

interface Props {
  canPlay: boolean;
  onStart: () => void;
}

export function OdysseyHero({ canPlay, onStart }: Props) {
  // Animations pour le bouton Play et l'arrivée du contenu
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    // Animation d'entrée fluide et organique
    opacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.exp) });
    translateY.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.exp) });
  }, []);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (canPlay) {
      scale.value = withSpring(0.92, { damping: 10, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (canPlay) {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('@/assets/images/bg-level-1.png')}
        style={styles.heroImage}
      >
        {/* Dégradé pour la profondeur et fondre naturellement avec le Drawer */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
          locations={[0.4, 0.75, 1]}
          style={styles.gradientOverlay}
        />
        
        {/* Overlay si la partie est verrouillée (Locked State) */}
        {!canPlay && (
          <View style={styles.lockedOverlay}>
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
        )}

        <Animated.View style={[styles.heroContentWrapper, animatedContentStyle]}>
          
          {/* Bloc de texte avec effet Glassmorphism */}
          <BlurView intensity={35} tint="dark" style={styles.glassCard}>
            <View style={styles.headerGlass}>
              <Ionicons name="compass" size={16} color={COLORS.accent} style={styles.iconSpaced} />
              <Text style={styles.heroLabel}>MODE PRINCIPAL</Text>
            </View>
            <Text style={styles.heroTitle}>L'Odyssée{"\n"}Temporelle</Text>
            <Text style={styles.heroDesc}>
              Explorez les époques et replacez l'histoire dans sa véritable chronologie.
            </Text>
          </BlurView>

          {/* Bouton de Play Magnétique/Scalable */}
          <TouchableWithoutFeedback
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onStart}
            disabled={!canPlay}
          >
            <Animated.View style={[styles.playButtonWrapper, animatedButtonStyle, !canPlay && styles.playButtonDisabled]}>
              <BlurView intensity={canPlay ? 50 : 80} tint="light" style={styles.playButtonGlass}>
                {canPlay ? (
                  <LinearGradient
                    colors={[COLORS.gold, COLORS.accent]}
                    style={styles.playIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="play" size={36} color="#FFF" style={{ marginLeft: 6 }} />
                  </LinearGradient>
                ) : (
                  <View style={[styles.playIconContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Ionicons name="lock-closed" size={30} color="#FFF" />
                  </View>
                )}
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>

        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  heroImage: {
    flex: 1,
    width: width,
    height: height,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.5)', // Désature et assombrit subtilement l'image
  },
  heroContentWrapper: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 150, // Fixé pour laisser la place au Progression Drawer
    paddingHorizontal: 24,
  },
  glassCard: {
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    width: '100%',
    marginBottom: 40,
  },
  headerGlass: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(166, 124, 31, 0.5)',
  },
  iconSpaced: {
    marginRight: 8,
  },
  heroLabel: {
    color: '#F4D068', // Or clair très premium
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: 52,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingHorizontal: 10,
  },
  playButtonWrapper: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 15,
  },
  playButtonDisabled: {
    opacity: 0.9,
  },
  playButtonGlass: {
    padding: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  playIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

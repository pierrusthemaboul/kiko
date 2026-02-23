import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  primary: '#002B5B',
  accent: '#A67C1F',
  textPrimary: '#1C1C1C',
  textMuted: '#7A7267',
  divider: '#E8E1D5',
};

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  infoOnly?: boolean;
}

export default function AIConsentModal({ visible, onAccept, infoOnly = false }: AIConsentModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle-outline" size={48} color={COLORS.accent} />
            </View>

            <Text style={styles.title}>
              Illustrations générées par Intelligence Artificielle
            </Text>

            <View style={styles.separator} />

            <Text style={styles.paragraph}>
              Toutes les <Text style={styles.bold}>illustrations</Text> de ce jeu ont été générées
              par intelligence artificielle à des fins <Text style={styles.bold}>ludiques et éducatives</Text>.
              Elles peuvent contenir des <Text style={styles.bold}>anachronismes</Text> ou des
              inexactitudes visuelles.
            </Text>

            <Text style={styles.paragraph}>
              Ce jeu <Text style={styles.bold}>n'est pas une source scientifique</Text>.
              Pour plus de rigueur historique, nous vous recommandons de consulter des
              {' '}<Text style={styles.bold}>historiens professionnels</Text> et des ouvrages spécialisés.
            </Text>

            <View style={styles.separator} />

            <TouchableOpacity style={styles.acceptButton} onPress={onAccept} activeOpacity={0.8}>
              <Text style={styles.acceptButtonText}>
                {infoOnly ? 'Fermer' : "J'ai compris et j'accepte"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 16,
  },
  paragraph: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 23,
    marginBottom: 12,
    textAlign: 'left',
  },
  bold: {
    fontWeight: '700',
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

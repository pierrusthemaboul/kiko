import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase/supabaseClients';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { FirebaseAnalytics } from '../../lib/firebase';
import { FontAwesome } from '@expo/vector-icons';

// Même thème que la page de login
const THEME = {
  primary: '#0A173D',
  secondary: '#F0F0F0',
  accent: '#F57C00',
  text: '#0A173D',
  textSecondary: '#666666',
  textOnAccent: '#FFFFFF',
  background: {
    main: '#FFFFFF',
  },
  button: {
    primary: {
      background: '#F57C00',
      text: '#FFFFFF',
    },
    secondary: {
      text: '#F57C00',
    },
  },
  border: '#DDDDDD'
};

export default function ResetPassword() {
  const navigation = useNavigation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      FirebaseAnalytics.screen('ResetPasswordScreen', 'ResetPassword');
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(THEME.background.main);
      }
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const validatePassword = () => {
    if (!newPassword || !confirmPassword) {
      setErrorMessage('Veuillez remplir tous les champs.');
      return false;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.');
      return false;
    }

    return true;
  };

  const handleUpdatePassword = async () => {
    setErrorMessage('');

    if (!validatePassword()) {
      return;
    }

    FirebaseAnalytics.trackEvent('password_update_attempt', { screen: 'reset_password' });
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Update password error:', error.message);
        setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
        FirebaseAnalytics.trackEvent('password_update_failed', {
          screen: 'reset_password',
          message: error.message.substring(0, 100),
        });
      } else {
        setPasswordReset(true);
        FirebaseAnalytics.trackEvent('password_updated', { screen: 'reset_password' });
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      FirebaseAnalytics.trackEvent('password_update_failed', {
        screen: 'reset_password',
        message: (err instanceof Error ? err.message : String(err)).substring(0, 100),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    router.replace('/auth/login');
  };

  if (passwordReset) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.successContainer}>
            <FontAwesome name="check-circle" size={64} color={THEME.accent} />
            <Text style={styles.successTitle}>Mot de passe modifié !</Text>
            <Text style={styles.successMessage}>
              Votre mot de passe a été réinitialisé avec succès.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleGoToLogin}
            >
              <Text style={styles.buttonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nouveau mot de passe"
          placeholderTextColor={THEME.textSecondary}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          editable={!isLoading}
          autoFocus
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          placeholderTextColor={THEME.textSecondary}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          autoComplete="password-new"
          editable={!isLoading}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (isLoading || !newPassword || !confirmPassword) && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={isLoading || !newPassword || !confirmPassword}
        >
          {isLoading ? (
            <ActivityIndicator color={THEME.button.primary.text} />
          ) : (
            <Text style={styles.buttonText}>Réinitialiser le mot de passe</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background.main
  },
  container: {
    flex: 1,
    backgroundColor: THEME.background.main,
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    color: THEME.accent,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
    lineHeight: 22
  },
  input: {
    backgroundColor: THEME.secondary,
    color: THEME.text,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderRadius: 8,
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: THEME.border
  },
  errorText: {
    color: '#D32F2F',
    marginVertical: 15,
    textAlign: 'center',
    fontSize: 14
  },
  button: {
    backgroundColor: THEME.button.primary.background,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
    minHeight: 50,
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: THEME.button.primary.text,
    fontSize: 17,
    fontWeight: 'bold'
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    color: THEME.accent,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15
  },
  successMessage: {
    fontSize: 16,
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 20
  },
});

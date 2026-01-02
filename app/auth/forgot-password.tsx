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

export default function ForgotPassword() {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      FirebaseAnalytics.screen('ForgotPasswordScreen', 'ForgotPassword');
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(THEME.background.main);
      }
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Veuillez entrer votre adresse email.');
      return;
    }

    FirebaseAnalytics.trackEvent('password_reset_attempt', { screen: 'forgot_password' });
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Tentative sans redirectTo pour utiliser l'URL par défaut du template
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        console.error('❌ Reset password error:', error.message);

        // Message d'erreur plus détaillé selon le type d'erreur
        if (error.message.includes('email')) {
          setErrorMessage(
            'Le service d\'envoi d\'email n\'est pas configuré.\n\n' +
            'Veuillez contacter le support ou créer un nouveau compte si vous ne parvenez pas à vous connecter.'
          );
        } else if (error.message.includes('User not found')) {
          setErrorMessage('Aucun compte n\'existe avec cette adresse email.');
        } else {
          setErrorMessage(`Erreur: ${error.message}\n\nVeuillez réessayer ou contacter le support.`);
        }

        FirebaseAnalytics.trackEvent('password_reset_failed', {
          screen: 'forgot_password',
          message: error.message.substring(0, 100),
        });
      } else {
        setEmailSent(true);
        FirebaseAnalytics.trackEvent('password_reset_email_sent', { screen: 'forgot_password' });
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setErrorMessage('Une erreur inattendue est survenue. Veuillez réessayer ou contacter le support.');
      FirebaseAnalytics.trackEvent('password_reset_failed', {
        screen: 'forgot_password',
        message: (err instanceof Error ? err.message : String(err)).substring(0, 100),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.successContainer}>
            <FontAwesome name="check-circle" size={64} color={THEME.accent} />
            <Text style={styles.successTitle}>Email envoyé !</Text>
            <Text style={styles.successMessage}>
              Un lien de réinitialisation a été envoyé à{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.instructionsText}>
              Consultez votre boîte email et cliquez sur le lien pour réinitialiser votre mot de passe.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleGoBack}
            >
              <Text style={styles.buttonText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          disabled={isLoading}
        >
          <FontAwesome name="arrow-left" size={20} color={THEME.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={THEME.textSecondary}
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isLoading}
          autoFocus
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (isLoading || !email) && styles.buttonDisabled]}
          onPress={handleResetPassword}
          disabled={isLoading || !email}
        >
          {isLoading ? (
            <ActivityIndicator color={THEME.button.primary.text} />
          ) : (
            <Text style={styles.buttonText}>Envoyer le lien</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToLoginButton}
          onPress={handleGoBack}
          disabled={isLoading}
        >
          <Text style={styles.backToLoginText}>Retour à la connexion</Text>
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
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    padding: 10,
    zIndex: 10
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
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 10
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
  backToLoginButton: {
    marginTop: 25,
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    minHeight: 48,
    width: '100%',
  },
  backToLoginText: {
    color: THEME.button.secondary.text,
    fontSize: 16,
    textDecorationLine: 'underline'
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
    marginBottom: 10,
    lineHeight: 24
  },
  emailText: {
    fontWeight: 'bold',
    color: THEME.accent
  },
  instructionsText: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20
  },
});

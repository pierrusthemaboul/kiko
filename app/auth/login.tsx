import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase/supabaseClients';
import { router, useFocusEffect, useNavigation, usePathname, useSegments } from 'expo-router';
import { FirebaseAnalytics } from '../../lib/firebase';

// --- NOUVEAU THÈME CLAIR (Basé sur logo Quandi) ---
const THEME = {
  primary: '#0A173D',       // Bleu foncé (Texte principal, éléments importants)
  secondary: '#F0F0F0',     // Gris clair (Fond des inputs)
  accent: '#F57C00',       // Orange (Boutons principaux, titres, liens)
  text: '#0A173D',           // Couleur de texte par défaut (Bleu foncé)
  textSecondary: '#666666',   // Gris moyen (Placeholders, textes secondaires)
  textOnAccent: '#FFFFFF',   // Blanc (Texte sur boutons orange)
  background: {
    main: '#FFFFFF',        // Fond principal blanc
  },
  button: {
    primary: {
      background: '#F57C00', // Orange
      text: '#FFFFFF',       // Blanc
    },
    secondary: { // Pour les liens/boutons textuels
      text: '#F57C00',       // Orange
    },
  },
  border: '#DDDDDD'          // Couleur de bordure subtile pour inputs
};
// --- FIN NOUVEAU THÈME ---

WebBrowser.maybeCompleteAuthSession();

const APP_AUTH_SCHEME = 'juno2';
const GOOGLE_REDIRECT_PATH = 'auth/callback';

export default function Login() {
  const navigation = useNavigation();
  const pathname = usePathname();
  const segments = useSegments();
  const window = Dimensions.get('window');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stayConnected, setStayConnected] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      FirebaseAnalytics.screen('LoginScreen', 'Login');
      // Style de la barre de statut pour fond clair
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(THEME.background.main);
      }
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // useEffect pour les logs (optionnel en prod)
  useEffect(() => {
    // console.log('🔍 Login Screen Mounted');
    // console.log('📍 Current pathname:', pathname);
    // console.log('🔀 Current segments:', segments);
    // return () => console.log('🔍 Login Screen Unmounted');
  }, [pathname, segments]);

  const handleLogin = async () => {
    FirebaseAnalytics.logEvent('login_attempt');
    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      // ... (reste de la logique handleLogin, inchangée) ...
      if (error) {
        console.error('❌ Login error:', error.message);
        let reason = 'supabase_error';
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage("Identifiants incorrects ou compte inexistant.");
          reason = 'invalid_credentials';
        } else {
          setErrorMessage(error.message);
        }
        FirebaseAnalytics.logEvent('login_failed', {
            reason: reason,
            message: error.message.substring(0, 100)
        });
        setIsLoggingIn(false); // Important de remettre à false ici
        return;
      }

      if (data?.session && data.user) {
        FirebaseAnalytics.logEvent('login', { method: 'password' });
        FirebaseAnalytics.initialize(data.user.id, false);

        if (stayConnected) {
        }

        router.replace('/(tabs)');
        // Note: setIsLoggingIn(false) n'est pas nécessaire ici car l'écran est remplacé

      } else {
        console.error('❌ No session created or user data missing');
        setErrorMessage("Erreur lors de la connexion. Veuillez réessayer.");
        FirebaseAnalytics.logEvent('login_failed', { reason: 'no_session_or_user' });
        setIsLoggingIn(false); // Remettre à false
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      FirebaseAnalytics.logEvent('login_failed', {
          reason: 'unexpected',
          message: (err instanceof Error ? err.message : String(err)).substring(0, 100)
      });
      setIsLoggingIn(false); // Remettre à false
    }
    // Retiré le finally car on gère setIsLoggingIn(false) dans chaque branche d'erreur
  };

  const handleGoogleLogin = async () => {
    FirebaseAnalytics.logEvent('login_attempt', { method: 'google' });
    setErrorMessage('');
    setIsGoogleLoggingIn(true);

    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: APP_AUTH_SCHEME,
        path: GOOGLE_REDIRECT_PATH,
        useProxy: false,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ Google login error:', error.message);
        FirebaseAnalytics.logEvent('login_failed', {
          reason: 'google_oauth_error',
          message: error.message.substring(0, 100),
        });
        setErrorMessage('Connexion Google indisponible pour le moment. Veuillez réessayer.');
        return;
      }

      if (!data?.url) {
        console.error('❌ Google login error: No redirect URL returned from Supabase.');
        FirebaseAnalytics.logEvent('login_failed', {
          reason: 'google_no_url',
        });
        setErrorMessage('Connexion Google indisponible pour le moment. Veuillez réessayer.');
        return;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (authResult.type === 'success' && authResult.url) {
        const parsed = Linking.parse(authResult.url);
        const qp = (parsed.queryParams ?? {}) as Record<string, string>;

        if (qp.error) {
          const errorDescription = qp.error_description ?? qp.error;
          console.error('OAuth error:', errorDescription);
          setErrorMessage(errorDescription ?? 'Connexion Google échouée.');
          FirebaseAnalytics.logEvent('login_failed', {
            reason: 'google_oauth_error',
            message: errorDescription.substring(0, 100),
          });
          return;
        }

        const authCode = Array.isArray(qp.code) ? qp.code[0] : qp.code;

        if (authCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);

          if (exchangeError) {
            console.error('Exchange failed:', exchangeError);
            setErrorMessage('Impossible de finaliser la connexion Google.');
            FirebaseAnalytics.logEvent('login_failed', {
              reason: 'google_exchange_failed',
              message: exchangeError.message.substring(0, 100),
            });
            return;
          }

          FirebaseAnalytics.logEvent('login', { method: 'google' });
          router.replace('/(tabs)');
          return;
        }

        console.warn('Google OAuth success without code in callback URL.');
        setErrorMessage('Connexion Google indisponible pour le moment. Veuillez réessayer.');
      } else {
        switch (authResult.type) {
          case 'dismiss':
          case 'cancel':
            FirebaseAnalytics.logEvent('login_failed', { reason: 'google_cancelled' });
            setErrorMessage('Connexion Google annulée.');
            break;
          case 'locked':
            console.warn('⚠️ Google OAuth flow is already in progress.');
            setErrorMessage('Une autre tentative de connexion est déjà en cours.');
            break;
          default:
            console.warn('🔁 Google OAuth ended with unexpected result type:', authResult.type);
            setErrorMessage('Connexion Google indisponible pour le moment. Veuillez réessayer.');
        }
      }
    } catch (err) {
      console.error('❌ Unexpected Google login error:', err);
      const message = err instanceof Error ? err.message : String(err);
      FirebaseAnalytics.logEvent('login_failed', {
        reason: 'google_unexpected_error',
        message: message.substring(0, 100),
      });
      setErrorMessage('Une erreur est survenue avec Google. Veuillez réessayer.');
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  const handleGoToSignUp = () => {
    FirebaseAnalytics.logEvent('navigate_to_signup');
    router.push('/auth/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Connexion</Text>

        <TouchableOpacity
          style={[styles.googleButton, (isLoggingIn || isGoogleLoggingIn) && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={isLoggingIn || isGoogleLoggingIn}
        >
          {isGoogleLoggingIn ? (
            <ActivityIndicator color={THEME.text} />
          ) : (
            <View style={styles.googleButtonContent}>
              <FontAwesome name="google" size={20} color={THEME.text} />
              <Text style={styles.googleButtonText}>Continuer avec Google</Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={THEME.textSecondary} // Utilisation de la couleur secondaire pour placeholder
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isLoggingIn}
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={THEME.textSecondary} // Utilisation de la couleur secondaire pour placeholder
          secureTextEntry
          value={password}
          onChangeText={(text) => setPassword(text)}
          autoComplete="current-password"
          editable={!isLoggingIn}
        />

        <View style={styles.stayConnectedContainer}>
          <Switch
            trackColor={{ false: '#CCCCCC', true: THEME.accent + 'AA' }} // Orange semi-transparent quand actif
            thumbColor={stayConnected ? THEME.accent : '#f4f3f4'}
            ios_backgroundColor="#CCCCCC"
            onValueChange={setStayConnected}
            value={stayConnected}
            disabled={isLoggingIn}
          />
          <Text style={styles.stayConnectedText}>Rester connecté</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (isLoggingIn || isGoogleLoggingIn || !email || !password) && styles.buttonDisabled]} // Appliquer style disabled aussi si champs vides
          onPress={handleLogin}
          disabled={isLoggingIn || isGoogleLoggingIn || !email || !password}
        >
          {isLoggingIn ? (
            <ActivityIndicator color={THEME.button.primary.text} /> // Couleur texte du bouton
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createAccountButton, isLoggingIn && styles.buttonDisabled]} // Désactiver visuellement si en cours de login
          onPress={handleGoToSignUp}
          disabled={isLoggingIn}
        >
          <Text style={styles.createAccountText}>Créer un compte</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background.main // Fond blanc
  },
  container: {
    flex: 1,
    backgroundColor: THEME.background.main, // Fond blanc
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 28,
    color: THEME.accent, // Orange
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30
  },
  input: {
    backgroundColor: THEME.secondary, // Fond gris clair
    color: THEME.text, // Texte bleu foncé
    fontSize: 16,
    paddingVertical: 14, // Padding vertical pour hauteur
    paddingHorizontal: 12,
    marginBottom: 15,
    borderRadius: 8,
    width: '100%',
    minHeight: 48, // Hauteur minimale pour accessibilité
    borderWidth: 1, // Bordure subtile
    borderColor: THEME.border // Couleur bordure
  },
  stayConnectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20, // Marge augmentée
    alignSelf: 'flex-start', // Aligner à gauche
    paddingVertical: 5 // Petit padding vertical pour zone tactile
  },
  stayConnectedText: {
    color: THEME.text, // Texte bleu foncé
    marginLeft: 10,
    fontSize: 16
  },
  errorText: {
    color: '#D32F2F', // Rouge plus standard
    marginVertical: 15, // Marge augmentée
    textAlign: 'center',
    fontSize: 14
  },
  button: {
    backgroundColor: THEME.button.primary.background, // Fond Orange
    paddingVertical: 14, // Padding vertical
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
    minHeight: 50, // Hauteur minimale bouton
    justifyContent: 'center'
  },
  buttonDisabled: {
     opacity: 0.6 // Opacité pour état désactivé
   },
  googleButton: {
    backgroundColor: THEME.background.main,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 20,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  buttonText: {
    color:'#0A173D', // Texte Blanc
    fontSize: 17, // Police légèrement plus grande
    fontWeight: 'bold'
  },
  createAccountButton: {
    marginTop: 25, // Marge augmentée
    alignItems: 'center',
    paddingVertical: 15, // Augmenter PADDING vertical pour zone tactile
    paddingHorizontal: 10,
    minHeight: 48, // Assurer taille minimale zone tactile
    width: '100%', // Prendre toute la largeur pour faciliter le clic
  },
  createAccountText: {
    color: THEME.button.secondary.text, // Texte Orange
    fontSize: 16,
    textDecorationLine: 'underline'
  },
});

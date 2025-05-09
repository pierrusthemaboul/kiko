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
    console.log('🔐 Starting login process...');
    FirebaseAnalytics.logEvent('login_attempt');
    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      console.log('📧 Attempting login with email:', email.trim());
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
        console.log('✅ Session created successfully for user:', data.user.id);
        FirebaseAnalytics.logEvent('login', { method: 'password' });
        FirebaseAnalytics.initialize(data.user.id, false);

        if (stayConnected) {
          console.log('🔄 Setting persistent session (handled by Supabase client)');
        }

        console.log('🚀 Attempting navigation...');
        router.replace('/(tabs)');
        console.log('✅ Navigation completed via router.replace');
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

  const handleGoToSignUp = () => {
    FirebaseAnalytics.logEvent('navigate_to_signup');
    router.push('/auth/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Connexion</Text>

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
          style={[styles.button, (isLoggingIn || !email || !password) && styles.buttonDisabled]} // Appliquer style disabled aussi si champs vides
          onPress={handleLogin}
          disabled={isLoggingIn || !email || !password}
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
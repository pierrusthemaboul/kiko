// /home/pierre/sword/kiko/app/auth/login.tsx

import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'; // Ajout de useCallback
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
  ActivityIndicator // Optionnel pour l'indicateur
} from 'react-native';
import { supabase } from '../../lib/supabase/supabaseClients';
import { router, useFocusEffect, useNavigation, usePathname, useSegments } from 'expo-router'; // Ajout de useFocusEffect
import { FirebaseAnalytics } from '../../lib/firebase'; // <-- AJOUT: Importer FirebaseAnalytics

const THEME = { /* ... (votre thème) ... */
  primary: '#050B1F',
  secondary: '#0A173D',
  accent: '#FFCC00',
  text: '#FFFFFF',
  background: { dark: '#020817', medium: '#050B1F', light: '#0A173D' },
  button: { primary: ['#1D5F9E', '#0A173D'], secondary: ['#FFBF00', '#CC9900'], tertiary: ['#0A173D', '#1D5F9E'] }
};

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

  // --- AJOUT: Suivi de l'écran ---
  useFocusEffect(
    useCallback(() => {
      FirebaseAnalytics.screen('LoginScreen', 'Login');
      // Vous pourriez vouloir réinitialiser les champs/erreurs quand l'écran réapparaît
      // setErrorMessage('');
      // setEmail('');
      // setPassword('');
    }, [])
  );
  // --- FIN AJOUT ---

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.background.dark);
    }
    // Les logs console peuvent être retirés en prod
    // console.log('🔍 Login Screen Mounted');
    // console.log('📍 Current pathname:', pathname);
    // console.log('🔀 Current segments:', segments);
    // return () => console.log('🔍 Login Screen Unmounted');
  }, [pathname, segments]);

  const handleLogin = async () => {
    console.log('🔐 Starting login process...');
    // --- AJOUT: Log Tentative ---
    FirebaseAnalytics.logEvent('login_attempt');
    // --------------------------
    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      console.log('📧 Attempting login with email:', email.trim());
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      console.log('📊 Login response:', { /* ... */ });

      if (error) {
        console.error('❌ Login error:', error.message);
        let reason = 'supabase_error';
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage("Identifiants incorrects ou compte inexistant.");
          reason = 'invalid_credentials';
        } else {
          setErrorMessage(error.message);
        }
        // --- AJOUT: Log Échec (Erreur Supabase) ---
        FirebaseAnalytics.logEvent('login_failed', {
            reason: reason,
            message: error.message.substring(0, 100) // Limiter longueur message
        });
        // ----------------------------------------
        return; // Important de retourner ici
      }

      if (data?.session && data.user) { // Vérifier aussi data.user
        console.log('✅ Session created successfully for user:', data.user.id);
        // --- AJOUT: Log Succès ---
        FirebaseAnalytics.logEvent('login', { method: 'password' }); // Événement standard Firebase
        // Mettre à jour l'ID utilisateur dans Analytics (peut être redondant si fait dans _layout)
        FirebaseAnalytics.initialize(data.user.id, false);
        // -------------------------

        if (stayConnected) {
          console.log('🔄 Setting persistent session');
          // Note: setSession est pour les refresh tokens, la session initiale est déjà gérée par Supabase client
          // await supabase.auth.setSession(data.session); // Vérifier si c'est nécessaire avec le client JS v2
        }

        console.log('🚀 Attempting navigation...');
        router.replace('/(tabs)'); // Utiliser replace pour ne pas pouvoir revenir à l'écran de login
        console.log('✅ Navigation completed via router.replace');

      } else {
        console.error('❌ No session created or user data missing');
        setErrorMessage("Erreur lors de la connexion. Veuillez réessayer.");
        // --- AJOUT: Log Échec (Pas de session) ---
        FirebaseAnalytics.logEvent('login_failed', { reason: 'no_session_or_user' });
        // --------------------------------------
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      // --- AJOUT: Log Échec (Erreur Inattendue) ---
      FirebaseAnalytics.logEvent('login_failed', {
          reason: 'unexpected',
          message: (err instanceof Error ? err.message : String(err)).substring(0, 100)
      });
      // ------------------------------------------
    } finally {
      console.log('🏁 Login process completed');
      setIsLoggingIn(false);
    }
  };

  const handleGoToSignUp = () => {
    // --- AJOUT: Log Navigation vers Signup ---
    FirebaseAnalytics.logEvent('navigate_to_signup');
    // -------------------------------------
    router.push('/auth/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Connexion</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={`${THEME.text}66`}
          value={email}
          onChangeText={(text) => setEmail(text.trim())} // Trim au changement
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isLoggingIn} // Désactiver pendant la connexion
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor={`${THEME.text}66`}
          secureTextEntry
          value={password}
          onChangeText={(text) => setPassword(text)}
          autoComplete="current-password" // Utiliser current-password
          editable={!isLoggingIn} // Désactiver pendant la connexion
        />

        <View style={styles.stayConnectedContainer}>
          <Switch
            // ... (props switch) ...
            value={stayConnected}
            onValueChange={setStayConnected}
            disabled={isLoggingIn}
          />
          <Text style={styles.stayConnectedText}>Rester connecté</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoggingIn && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoggingIn || !email || !password} // Désactiver si champs vides ou en cours
        >
          {isLoggingIn ? (
            <ActivityIndicator color={THEME.text} />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createAccountButton, isLoggingIn && styles.buttonDisabled]}
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
  // ... (vos styles) ...
  safeArea: { flex: 1, backgroundColor: THEME.background.dark },
  container: { flex: 1, backgroundColor: THEME.background.dark, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, color: THEME.accent, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: THEME.secondary, color: THEME.text, fontSize: 16, padding: 12, marginBottom: 15, borderRadius: 8, width: '100%' },
  stayConnectedContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stayConnectedText: { color: THEME.text, marginLeft: 8, fontSize: 16 },
  errorText: { color: '#FF6B6B', marginVertical: 10, textAlign: 'center', fontSize: 14 }, // Rouge plus visible
  button: { backgroundColor: THEME.button.secondary[0], padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15, width: '100%', minHeight: 50, justifyContent: 'center' }, // Hauteur minimale
  buttonDisabled: { opacity: 0.6 }, // Opacité standard pour désactivé
  buttonText: { color: THEME.primary, fontSize: 16, fontWeight: 'bold' }, // Texte du bouton plus contrasté
  createAccountButton: { marginTop: 20, alignItems: 'center', padding: 10 }, // Zone cliquable plus grande
  createAccountText: { color: THEME.accent, fontSize: 16, textDecorationLine: 'underline' },
});
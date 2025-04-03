// /home/pierre/sword/kiko/app/auth/signup.tsx

import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase/supabaseClients';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { FirebaseAnalytics } from '../../lib/firebase';

const THEME = { /* ... (votre thème) ... */
  primary: '#050B1F',
  secondary: '#0A173D',
  accent: '#FFCC00',
  text: '#FFFFFF',
  background: { dark: '#020817', medium: '#050B1F', light: '#0A173D' },
  button: { primary: ['#1D5F9E', '#0A173D'], secondary: ['#FFBF00', '#CC9900'], tertiary: ['#0A173D', '#1D5F9E'] }
};

export default function SignUp() {
  const navigation = useNavigation();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  useFocusEffect(
    useCallback(() => {
      FirebaseAnalytics.screen('SignUpScreen', 'SignUp');
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.background.dark);
    }
  }, [navigation]);

  const handleSignUp = async () => {
    if (isSigningUp) return;

    console.log('🔐 Starting signup process...');
    FirebaseAnalytics.logEvent('signup_attempt');
    setIsSigningUp(true);
    setErrorMessage('');
    setSuccessMessage('');

    const failSignup = (reason: string, message: string, logMessage?: string) => {
      setErrorMessage(message);
      FirebaseAnalytics.logEvent('signup_failed', {
        reason: reason,
        message: (logMessage || message).substring(0, 100)
      });
      setIsSigningUp(false);
    };

    // 1. Validation Client
    if (!nickname.trim()) return failSignup('validation_nickname', 'Le pseudonyme est obligatoire.');
    // La validation > 20 est redondante car gérée par maxLength={20}
    const forbiddenChars = /[\\\/]/g;
    if (forbiddenChars.test(nickname)) return failSignup('validation_nickname_chars', 'Le pseudonyme contient des caractères interdits (\\ ou /).');
    if (!email.trim()) return failSignup('validation_email', "L'email est obligatoire.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return failSignup('validation_email_format', "Le format de l'email est invalide.");
    if (!password || password.length < 6) return failSignup('validation_password', 'Le mot de passe doit contenir au moins 6 caractères.');

    try {
      // 3. Vérification Pseudo Existant
      console.log('🔍 Checking if nickname exists:', nickname.trim());
      const { data: existingProfile, error: checkProfileError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('display_name', nickname.trim());

      if (checkProfileError && checkProfileError.code !== 'PGRST116') {
        console.error('❌ Check nickname error:', checkProfileError);
        return failSignup('nickname_check_error', 'Erreur lors de la vérification du pseudonyme.', checkProfileError.message);
      }

      if (existingProfile?.count && existingProfile.count > 0) {
        return failSignup('nickname_exists', 'Ce pseudonyme est déjà utilisé. Veuillez en choisir un autre.');
      }
      console.log('✅ Nickname available.');

      // 4. Inscription Supabase
      console.log('📧 Attempting Supabase signup for email:', email.trim());
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {},
      });

      if (signUpError) {
        console.error('❌ Signup error:', signUpError);
        let reason = 'supabase_signup_error';
        let message = signUpError.message;
        if (signUpError.message.toLowerCase().includes('user already registered') || signUpError.message.toLowerCase().includes('email address is already registered')) {
           reason = 'email_exists';
           message = 'Cet email est déjà utilisé pour un compte.';
        } else if (signUpError.message.toLowerCase().includes('valid email')) {
           reason = 'email_invalid_supabase';
           message = "L'adresse email fournie est invalide selon le serveur.";
        }
        return failSignup(reason, message, signUpError.message);
      }

      if (!signUpData?.user) {
        console.error('❌ Signup response missing user data.');
        return failSignup('no_user_data', 'Erreur lors de la création du compte (données utilisateur manquantes).');
      }

      const userId = signUpData.user.id;
      console.log('👤 User created in Supabase Auth:', userId);

      // 5. Création du profil
      console.log('✍️ Creating user profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            display_name: nickname.trim(),
            // Ajoutez d'autres champs obligatoires ici avec des valeurs par défaut si nécessaire
          });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        console.error("Orphaned user might exist:", userId);
        return failSignup('profile_creation_error', "Erreur lors de la finalisation de l'inscription. Contactez le support si le problème persiste.", profileError.message);
      }
      console.log('✅ Profile created successfully.');

      // 6. Succès
      setSuccessMessage('Compte créé avec succès! Redirection...');
      FirebaseAnalytics.logEvent('sign_up', { method: 'password' });
      FirebaseAnalytics.initialize(userId, false);

      setTimeout(() => {
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('❌ Navigation error after signup:', navError);
          setSuccessMessage('Compte créé! Veuillez vous connecter.');
          setIsSigningUp(false);
        }
      }, 1500);

    } catch (error) {
      console.error('❌ Unexpected error during signup:', error);
      failSignup('unexpected', 'Une erreur inattendue est survenue.', error instanceof Error ? error.message : String(error));
    } finally {
       console.log('🏁 Signup process potentially finished (check logs for success/failure/redirect)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Inscription</Text>

        <TextInput
          style={styles.input}
          placeholder="Pseudonyme (20 caractères max)" // Modifié ici
          placeholderTextColor={`${THEME.text}66`}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          maxLength={20} // Modifié ici
          editable={!isSigningUp}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={`${THEME.text}66`}
          value={email}
          onChangeText={(text) => setEmail(text.trim())}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isSigningUp}
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe (6 caractères min)"
          placeholderTextColor={`${THEME.text}66`}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          editable={!isSigningUp}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isSigningUp && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isSigningUp || !nickname.trim() || !email.trim() || !password || password.length < 6}
        >
          {isSigningUp ? (
            <ActivityIndicator color={THEME.text} />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

         <TouchableOpacity
            style={[styles.goBackButton, isSigningUp && styles.buttonDisabled]}
            onPress={() => !isSigningUp && router.push('/auth/login')}
            disabled={isSigningUp}
         >
            <Text style={styles.goBackText}>Déjà un compte ? Se connecter</Text>
         </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background.dark },
  container: { flexGrow: 1, backgroundColor: THEME.background.dark, padding: 20, justifyContent: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  title: { fontSize: 28, color: THEME.accent, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: THEME.secondary, color: THEME.text, fontSize: 16, padding: 12, marginBottom: 15, borderRadius: 8, width: '100%' },
  button: { backgroundColor: THEME.button.secondary[0], padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15, width: '100%', minHeight: 50, justifyContent: 'center'},
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: THEME.primary, fontSize: 16, fontWeight: 'bold' },
  error: { color: '#FF6B6B', marginVertical: 10, textAlign: 'center', fontSize: 14 },
  success: { color: '#4CAF50', marginVertical: 10, textAlign: 'center', fontWeight: 'bold', fontSize: 14 },
  goBackButton: { marginTop: 20, alignItems: 'center', padding: 10 },
  goBackText: { color: THEME.accent, fontSize: 16, textDecorationLine: 'underline' },
});
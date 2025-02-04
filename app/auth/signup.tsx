import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform
} from 'react-native';
import { supabase } from '../../lib/supabase/supabaseClients';
import { router } from 'expo-router';

const THEME = {
  primary: '#050B1F',
  secondary: '#0A173D',
  accent: '#FFCC00',
  text: '#FFFFFF',
  background: {
    dark: '#020817',
    medium: '#050B1F',
    light: '#0A173D'
  },
  button: {
    primary: ['#1D5F9E', '#0A173D'],
    secondary: ['#FFBF00', '#CC9900'],
    tertiary: ['#0A173D', '#1D5F9E']
  }
};

export default function SignUp() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleSignUp = async () => {
    if (isSigningUp) return;

    console.log('🔐 Starting signup process...');
    setIsSigningUp(true);
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Validation de base des champs
    if (!nickname.trim()) {
      setErrorMessage('Le pseudonyme est obligatoire.');
      setIsSigningUp(false);
      return;
    }

    // 2. Vérification de la longueur du pseudonyme (max 12 caractères)
    if (nickname.trim().length > 12) {
      setErrorMessage('Le pseudonyme ne peut pas dépasser 12 caractères.');
      setIsSigningUp(false);
      return;
    }

    // (Optionnel) Vérification de certains caractères spéciaux interdits
    const forbiddenChars = /[\\\/]/g;
    if (forbiddenChars.test(nickname)) {
      setErrorMessage('Le pseudonyme contient des caractères interdits (\\ ou /).');
      setIsSigningUp(false);
      return;
    }

    if (!email.trim()) {
      setErrorMessage("L'email est obligatoire.");
      setIsSigningUp(false);
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      setIsSigningUp(false);
      return;
    }

    try {
      // 3. Vérification si le pseudo est déjà utilisé en base
      //    (Requiert que ta table "profiles" ait une colonne "display_name".)
      const { data: existingProfile, error: checkProfileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('display_name', nickname.trim())
        .single();

      // Erreur inattendue lors de la vérification du pseudo
      if (checkProfileError && checkProfileError.code !== 'PGRST116') {
        console.error('❌ Check nickname error:', checkProfileError.message);
        setErrorMessage('Erreur lors de la vérification du pseudonyme.');
        setIsSigningUp(false);
        return;
      }

      // Si un profil existe déjà avec ce pseudo
      if (existingProfile) {
        setErrorMessage('Ce pseudonyme est déjà utilisé. Veuillez en choisir un autre.');
        setIsSigningUp(false);
        return;
      }

      // 4. Inscription de l'utilisateur (Supabase se charge de vérifier l’unicité de l’email)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: nickname.trim(),
          },
        },
      });

      if (signUpError) {
        console.error('❌ Signup error:', signUpError.message);
        // Supabase renvoie une erreur si l'email est déjà utilisée
        if (signUpError.message.includes('Email')) {
          setErrorMessage('Cet email est invalide ou déjà utilisé.');
        } else {
          setErrorMessage(signUpError.message);
        }
        return;
      }

      if (!data.user) {
        setErrorMessage('Erreur lors de la création du compte.');
        return;
      }

      // 5. Création du profil utilisateur avec des valeurs par défaut
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            display_name: nickname.trim(),
            high_score: 0,
            games_played: 0,
            current_level: 1,
            events_completed: 0,
            mastery_levels: {},
            is_admin: false
          }
        ]);

      if (profileError) {
        console.error('❌ Profile creation error:', profileError.message);
        setErrorMessage('Erreur lors de la création du profil. Veuillez réessayer.');
        return;
      }

      // 6. Succès et navigation
      setSuccessMessage('Compte créé avec succès!');

      // Attendre un peu pour que l'utilisateur voie le message de succès
      setTimeout(() => {
        try {
          router.push('/(tabs)');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          // Le compte est créé, on ne montre pas d'erreur supplémentaire
        }
      }, 1500);

    } catch (error) {
      console.error('❌ Unexpected error:', error);
      setErrorMessage('Une erreur inattendue est survenue.');
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Inscription</Text>

      <TextInput
        style={styles.input}
        placeholder="Pseudonyme"
        placeholderTextColor={`${THEME.text}66`}
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="none"
        autoComplete="username"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={`${THEME.text}66`}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor={`${THEME.text}66`}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoComplete="password-new"
      />

      {errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      {successMessage ? (
        <Text style={styles.success}>{successMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, isSigningUp && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={isSigningUp}
      >
        <Text style={styles.buttonText}>
          {isSigningUp ? "Création du compte..." : "S'inscrire"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: THEME.background.dark,
    padding: 20,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  title: {
    fontSize: 28,
    color: THEME.accent,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: THEME.secondary,
    color: THEME.text,
    fontSize: 16,
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    width: '100%',
  },
  button: {
    backgroundColor: THEME.button.secondary[0],
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },
  success: {
    color: '#4CAF50',
    marginVertical: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

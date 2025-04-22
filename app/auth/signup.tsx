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
      // Style de la barre de statut pour fond clair
      StatusBar.setBarStyle('dark-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(THEME.background.main);
      }
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
    // Déplacé la logique StatusBar dans useFocusEffect pour être sûr qu'elle s'applique
    // quand on navigue vers cet écran
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
      setIsSigningUp(false); // Important de remettre à false ici
    };

    // 1. Validation Client (inchangée)
    if (!nickname.trim()) return failSignup('validation_nickname', 'Le pseudonyme est obligatoire.');
    const forbiddenChars = /[\\\/]/g;
    if (forbiddenChars.test(nickname)) return failSignup('validation_nickname_chars', 'Le pseudonyme contient des caractères interdits (\\ ou /).');
    if (!email.trim()) return failSignup('validation_email', "L'email est obligatoire.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return failSignup('validation_email_format', "Le format de l'email est invalide.");
    if (!password || password.length < 6) return failSignup('validation_password', 'Le mot de passe doit contenir au moins 6 caractères.');

    try {
      // 3. Vérification Pseudo Existant (inchangée)
      console.log('🔍 Checking if nickname exists:', nickname.trim());
      const { count, error: checkProfileError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('display_name', nickname.trim());

      if (checkProfileError && checkProfileError.code !== 'PGRST116') { // PGRST116 = No rows found, which is good here
        console.error('❌ Check nickname error:', checkProfileError);
        return failSignup('nickname_check_error', 'Erreur lors de la vérification du pseudonyme.', checkProfileError.message);
      }

      if (count !== null && count > 0) { // Vérifier count explicitement
        return failSignup('nickname_exists', 'Ce pseudonyme est déjà utilisé. Veuillez en choisir un autre.');
      }
      console.log('✅ Nickname available.');


      // 4. Inscription Supabase (inchangée)
      console.log('📧 Attempting Supabase signup for email:', email.trim());
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {}, // Pas besoin de data ici pour le moment, mais on pourrait ajouter le nickname
      });

      if (signUpError) {
        console.error('❌ Signup error:', signUpError);
        let reason = 'supabase_signup_error';
        let message = "Une erreur est survenue lors de l'inscription."; // Message générique par défaut
        if (signUpError.message.toLowerCase().includes('user already registered') || signUpError.message.toLowerCase().includes('email address is already registered')) {
           reason = 'email_exists';
           message = 'Cet email est déjà utilisé pour un compte.';
        } else if (signUpError.message.toLowerCase().includes('valid email')) {
           reason = 'email_invalid_supabase';
           message = "L'adresse email fournie est invalide.";
        } else if (signUpError.message.toLowerCase().includes('password should be at least 6 characters')) {
            reason = 'password_too_short_supabase'; // Devrait être catché par la validation client mais sécurité en plus
            message = "Le mot de passe est trop court (minimum 6 caractères).";
        }
        return failSignup(reason, message, signUpError.message);
      }

      // Correction: Supabase signUp peut renvoyer un user même si la confirmation email est requise
      const user = signUpData?.user;
      if (!user) {
        console.error('❌ Signup response missing user data (might require email confirmation)');
        // Si la confirmation email est activée dans Supabase, l'utilisateur est créé mais pas la session
        // On pourrait afficher un message indiquant de vérifier les emails
        if(signUpData?.session === null){
             setSuccessMessage('Compte créé ! Veuillez vérifier votre email pour confirmer votre inscription.');
             FirebaseAnalytics.logEvent('sign_up', { method: 'password_email_confirmation_pending' });
             // Ne pas rediriger automatiquement, attendre la confirmation
             setTimeout(() => {
                 try {
                   // Retourner à l'écran de connexion après un délai
                   router.replace('/auth/login');
                 } catch (navError) {
                   console.error('❌ Navigation error after signup (email pending):', navError);
                 } finally {
                    setIsSigningUp(false); // Fin du processus ici
                 }
             }, 3000); // Délai plus long pour lire le message
             return; // Stopper l'exécution ici
        } else {
            // Cas d'erreur inattendu si pas d'utilisateur et pas de session null
             return failSignup('no_user_data', "Erreur lors de la création du compte (données utilisateur manquantes).");
        }
      }

      const userId = user.id;
      console.log('👤 User created/found in Supabase Auth:', userId);

      // 5. Création du profil (inchangée)
      console.log('✍️ Creating user profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            display_name: nickname.trim(),
            // email: email.trim(), // Ne pas stocker l'email ici s'il est déjà dans auth.users
          });

      if (profileError) {
        console.error('❌ Profile creation error:', profileError);
        // Tenter de nettoyer l'utilisateur auth si le profil échoue ? Pourrait être complexe.
        console.error("Orphaned user might exist:", userId);
        return failSignup('profile_creation_error', "Erreur lors de la finalisation de l'inscription. Contactez le support si le problème persiste.", profileError.message);
      }
      console.log('✅ Profile created successfully.');

      // 6. Succès (si la confirmation email n'est PAS requise ou déjà faite)
      setSuccessMessage('Compte créé avec succès! Redirection...');
      FirebaseAnalytics.logEvent('sign_up', { method: 'password' });
      FirebaseAnalytics.initialize(userId, false);

      setTimeout(() => {
        try {
          router.replace('/(tabs)');
        } catch (navError) {
          console.error('❌ Navigation error after signup:', navError);
          // Si la navigation échoue, au moins l'état est nettoyé
          setSuccessMessage('Compte créé! La redirection a échoué, veuillez vous connecter.');
          setIsSigningUp(false);
        }
        // setIsSigningUp(false) n'est pas nécessaire si la navigation réussit (composant démonté)
      }, 1500);

    } catch (error) {
      console.error('❌ Unexpected error during signup:', error);
      failSignup('unexpected', 'Une erreur inattendue est survenue.', error instanceof Error ? error.message : String(error));
    }
    // Retiré le finally car setIsSigningUp(false) est géré dans failSignup et après la redirection/timeout
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled" // Important pour que le tap sur le bouton fonctionne même si clavier ouvert
      >
        <Text style={styles.title}>Inscription</Text>

        <TextInput
          style={styles.input}
          placeholder="Pseudonyme (20 caractères max)"
          placeholderTextColor={THEME.textSecondary}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="none"
          maxLength={20}
          editable={!isSigningUp}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={THEME.textSecondary}
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
          placeholderTextColor={THEME.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password" // 'new-password' pour l'inscription
          editable={!isSigningUp}
        />

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (isSigningUp || !nickname.trim() || !email.trim() || !password || password.length < 6) && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={isSigningUp || !nickname.trim() || !email.trim() || !password || password.length < 6}
        >
          {isSigningUp ? (
            <ActivityIndicator color={THEME.button.primary.text} />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

         <TouchableOpacity
            style={[styles.goBackButton, isSigningUp && styles.buttonDisabled]} // Désactiver visuellement si en cours
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
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background.main // Fond blanc
  },
  container: {
    flexGrow: 1, // Important pour que ScrollView prenne la hauteur
    backgroundColor: THEME.background.main, // Fond blanc
    padding: 20,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Padding haut ajusté
    paddingBottom: 40 // Padding bas
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
  error: {
    color: '#D32F2F', // Rouge standard
    marginVertical: 15, // Marge augmentée
    textAlign: 'center',
    fontSize: 14
  },
  success: {
    color: '#388E3C', // Vert standard
    marginVertical: 15, // Marge augmentée
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14
  },
  goBackButton: {
    marginTop: 25, // Marge augmentée
    alignItems: 'center',
    paddingVertical: 15, // Augmenter PADDING vertical pour zone tactile
    paddingHorizontal: 10,
    minHeight: 48, // Assurer taille minimale zone tactile
    width: '100%', // Prendre toute la largeur
   },
  goBackText: {
    color: THEME.button.secondary.text, // Texte Orange
    fontSize: 16,
    textDecorationLine: 'underline'
  },
});
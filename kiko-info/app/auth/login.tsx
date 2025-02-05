import React, { useState, useEffect, useLayoutEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { supabase } from '../../lib/supabase/supabaseClients';
import { router, useNavigation, usePathname, useSegments } from 'expo-router';

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

  useLayoutEffect(() => {
    const options = {
      headerShown: false,
      title: '',
      headerTitle: '',
      header: null,
    };
    navigation.setOptions(options);
  }, [navigation]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.background.dark);
    }
    console.log('🔍 Login Screen Mounted');
    console.log('📍 Current pathname:', pathname);
    console.log('🔀 Current segments:', segments);

    return () => {
      console.log('🔍 Login Screen Unmounted');
    };
  }, []);

  const handleLogin = async () => {
    console.log('🔐 Starting login process...');
    setIsLoggingIn(true);
    setErrorMessage('');
  
    try {
      console.log('📧 Attempting login with email:', email.trim());
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
  
      console.log('📊 Login response:', { 
        user: !!data?.user, 
        session: !!data?.session, 
        error: !!error 
      });
  
      if (error) {
        console.error('❌ Login error:', error.message);
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage(
            "Identifiants incorrects ou compte inexistant.\nVeuillez vérifier vos informations ou créer un compte."
          );
        } else {
          setErrorMessage(error.message);
        }
        return;
      }
  
      if (data?.session) {
        console.log('✅ Session created successfully');
        
        if (stayConnected) {
          console.log('🔄 Setting persistent session');
          await supabase.auth.setSession(data.session);
        }
  
        // Essayons différentes approches de navigation
        console.log('🚀 Attempting navigation...');
        
        try {
          // Approche 1: Navigation directe
          router.push('/(tabs)');
          console.log('✅ Navigation approach 1 completed');
        } catch (e1) {
          console.error('❌ Navigation approach 1 failed:', e1);
          
          try {
            // Approche 2: Navigation avec délai
            setTimeout(() => {
              router.replace('/(tabs)');
              console.log('✅ Navigation approach 2 completed');
            }, 100);
          } catch (e2) {
            console.error('❌ Navigation approach 2 failed:', e2);
            
            try {
              // Approche 3: Navigation absolue
              navigation.navigate('(tabs)');
              console.log('✅ Navigation approach 3 completed');
            } catch (e3) {
              console.error('❌ All navigation approaches failed');
              console.error(e3);
              setErrorMessage("Erreur lors de la redirection. Veuillez réessayer.");
            }
          }
        }
  
      } else {
        console.error('❌ No session created');
        setErrorMessage("Erreur lors de la connexion. Veuillez réessayer.");
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      console.log('🏁 Login process completed');
      setIsLoggingIn(false);
    }
  };

  const handleGoToSignUp = () => {
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
          onChangeText={(text) => setEmail(text)}
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
          onChangeText={(text) => setPassword(text)}
          autoComplete="password"
        />

        <View style={styles.stayConnectedContainer}>
          <Switch
            trackColor={{ false: '#767577', true: THEME.accent }}
            thumbColor={stayConnected ? THEME.secondary : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            value={stayConnected}
            onValueChange={(value) => setStayConnected(value)}
          />
          <Text style={styles.stayConnectedText}>Rester connecté</Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, isLoggingIn && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={isLoggingIn}
        >
          <Text style={styles.buttonText}>
            {isLoggingIn ? 'Connexion...' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createAccountButton}
          onPress={handleGoToSignUp}
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
    backgroundColor: THEME.background.dark,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.background.dark,
    padding: 20,
    justifyContent: 'center',
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
  stayConnectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stayConnectedText: {
    color: THEME.text,
    marginLeft: 8,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: THEME.button.secondary[0],
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  buttonText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  createAccountButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  createAccountText: {
    color: THEME.accent,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
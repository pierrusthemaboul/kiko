import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../../lib/firebase';

interface UseAppleAuthReturn {
  isLoading: boolean;
  signIn: () => Promise<void>;
  isAvailable: boolean;
}

export function useAppleAuth(): UseAppleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const isAvailable = Platform.OS === 'ios';

  const signIn = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Non disponible', 'La connexion avec Apple est uniquement disponible sur iOS.');
      return;
    }

    setIsLoading(true);
    FirebaseAnalytics.trackEvent('login_attempt', { method: 'apple', screen: 'login' });

    try {
      // Request Apple credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Extract identity token
      const identityToken = credential.identityToken;
      const authorizationCode = credential.authorizationCode;

      if (!identityToken) {
        throw new Error('No identity token returned from Apple Sign In');
      }

      // Sign in with Supabase using the Apple provider
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        access_token: authorizationCode || undefined,
      });

      if (error) {
        console.error('❌ Apple login error:', error.message);
        FirebaseAnalytics.trackEvent('login_failed', {
          reason: 'apple_supabase_error',
          method: 'apple',
          screen: 'login',
          message: error.message.substring(0, 100),
        });
        Alert.alert('Erreur de connexion', 'Impossible de se connecter avec Apple. Veuillez réessayer.');
        return;
      }

      if (data?.user) {
        // 1. Store user's name in auth metadata if available (only on first sign in)
        let displayName = '';
        if (credential.fullName && (credential.fullName.givenName || credential.fullName.familyName)) {
          displayName = [
            credential.fullName.givenName,
            credential.fullName.familyName,
          ]
            .filter(Boolean)
            .join(' ');

          if (displayName) {
            // Update user metadata in Supabase
            await supabase.auth.updateUser({
              data: { display_name: displayName },
            });
          }
        }

        // 2. Ensure profile exists in the 'profiles' table
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          console.log('📝 Creating profile for Apple user:', data.user.id);
          const finalDisplayName = displayName || data.user.user_metadata.full_name || data.user.email?.split('@')[0] || 'Joueur';
          
          // Use a safer way to insert into profiles if there are type issues
          const { error: insertError } = await (supabase.from('profiles') as any).insert({
            id: data.user.id,
            display_name: finalDisplayName,
          });

          if (insertError) {
            console.error('❌ Failed to create profile for Apple user:', insertError.message);
          }
        }

        FirebaseAnalytics.trackEvent('login', { method: 'apple', screen: 'login' });
        FirebaseAnalytics.initialize(data.user.id, false);
      }
    } catch (error: any) {
      console.error('❌ Apple Sign In error:', error);

      // Handle specific Apple error codes
      if (error.code === 'ERR_CANCELED') {
        FirebaseAnalytics.trackEvent('login_failed', {
          reason: 'apple_cancelled',
          method: 'apple',
          screen: 'login',
        });
        // User cancelled, no alert needed
        return;
      }

      FirebaseAnalytics.trackEvent('login_failed', {
        reason: 'apple_error',
        method: 'apple',
        screen: 'login',
        message: error.message?.substring(0, 100) || 'Unknown error',
        error_code: error.code,
      });

      Alert.alert(
        'Erreur de connexion',
        'Une erreur est survenue lors de la connexion avec Apple. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    signIn,
    isAvailable,
  };
}

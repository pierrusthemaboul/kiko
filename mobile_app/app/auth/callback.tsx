import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase/supabaseClients';
import { View, StyleSheet } from 'react-native';
import { FirebaseAnalytics } from '../../lib/firebase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleAuthCallback();
  }, [params]);

  const handleAuthCallback = async () => {
    try {
      const qp = params as Record<string, string>;

      if (qp.error) {
        const errorDescription = qp.error_description ?? qp.error;
        console.error('OAuth error:', errorDescription);
        router.replace(`/auth/login?error=${encodeURIComponent(errorDescription)}`);
        return;
      }

      const authCode = Array.isArray(qp.code) ? qp.code[0] : qp.code;

      if (authCode) {
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);

        if (exchangeError) {
          console.error('Exchange failed:', exchangeError);
          router.replace('/auth/login?error=exchange_failed');
          return;
        }

        const user = exchangeData?.user;
        if (user) {
          // Vérifier si le profil existe déjà
          const { data: profile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!profile) {
            console.log('📝 Creating profile for OAuth user:', user.id);
            const profilesTable = supabase.from('profiles') as unknown;
            await (profilesTable as {
              insert: (values: { id: string; display_name: string }) => Promise<{ error: { message: string } | null }>;
            }).insert({
              id: user.id,
              display_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'Joueur',
            });
          }
        }

        FirebaseAnalytics.trackEvent('login', { method: 'oauth_callback', screen: 'callback' });
        router.replace('/(tabs)');
        return;
      }

      console.warn('OAuth callback without code, redirecting to login');
      router.replace('/auth/login');
    } catch (err) {
      console.error('❌ Unexpected callback error:', err);
      router.replace('/auth/login?error=unexpected');
    }
  };

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

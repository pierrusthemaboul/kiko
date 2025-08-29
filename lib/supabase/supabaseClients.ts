import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Database } from './database.types';

const extra = (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra ?? {};
const supabaseUrl: string | undefined = extra.supabaseUrl;
const supabaseKey: string | undefined = extra.supabaseKey;

// Debug visibility at runtime
console.log(`[supabaseClients] url set: ${!!supabaseUrl}, key set: ${!!supabaseKey}`);

if (!supabaseUrl) {
  console.error('[supabaseClients] Missing supabaseUrl in Expo extra.');
  throw new Error('supabaseUrl is required.');
}
if (!supabaseKey) {
  console.error('[supabaseClients] Missing supabaseKey in Expo extra.');
  throw new Error('supabaseKey is required.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

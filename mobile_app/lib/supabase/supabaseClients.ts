// import 'react-native-url-polyfill/auto'; (Retiré car natif en SDK 52)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

import { Platform } from 'react-native';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

// 🛡️ Safe Storage for SSR (Web)
const isSSR = Platform.OS === 'web' && typeof window === 'undefined';

const safeStorage = {
  getItem: (key: string) => isSSR ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => isSSR ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => isSSR ? Promise.resolve() : AsyncStorage.removeItem(key),
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

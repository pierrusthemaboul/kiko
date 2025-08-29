import Constants from 'expo-constants';

export function printExtra() {
  const extra = (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra ?? {};
  const supabaseUrl = extra?.supabaseUrl;
  const supabaseKey = extra?.supabaseKey;
  // Minimal, safe runtime log
  // eslint-disable-next-line no-console
  console.log('[printExtra]', { supabaseUrl: !!supabaseUrl, hasKey: !!supabaseKey });
}

export default printExtra;


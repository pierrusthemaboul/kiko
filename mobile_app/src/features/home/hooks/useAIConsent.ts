import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAIConsent() {
  const [aiConsentGiven, setAiConsentGiven] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('@ai_consent_accepted').then((value) => {
      setAiConsentGiven(value === 'true');
    });
  }, []);

  const acceptConsent = useCallback(async () => {
    await AsyncStorage.setItem('@ai_consent_accepted', 'true');
    setAiConsentGiven(true);
  }, []);

  return {
    aiConsentGiven,
    acceptConsent
  };
}

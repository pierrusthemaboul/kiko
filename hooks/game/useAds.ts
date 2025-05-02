import { useState, useEffect, useCallback, useRef } from 'react';
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { getAdUnitId } from '../../lib/config/adConfig';
import { FirebaseAnalytics } from '../../lib/firebase';
import { MAX_LIVES, User, Event, RewardType } from '../types';

const USE_TEST_IDS = __DEV__;

const genericInterstitial = InterstitialAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.INTERSTITIAL : getAdUnitId('INTERSTITIAL_GENERIC'),
  { requestNonPersonalizedAdsOnly: true }
);

const levelUpInterstitial = InterstitialAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.INTERSTITIAL : getAdUnitId('INTERSTITIAL_LEVEL_UP'),
  { requestNonPersonalizedAdsOnly: true }
);

const gameOverInterstitial = InterstitialAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.INTERSTITIAL : getAdUnitId('INTERSTITIAL_GAME_OVER'),
  { requestNonPersonalizedAdsOnly: true }
);

const rewardedAd = RewardedAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.REWARDED : getAdUnitId('REWARDED_EXTRA_LIFE'),
  { requestNonPersonalizedAdsOnly: true }
);

interface AdState {
  interstitialLoaded: boolean;
  gameOverInterstitialLoaded: boolean;
  levelUpInterstitialLoaded: boolean;
  rewardedLoaded: boolean;
  lastInterstitialTime: number;
  hasWatchedRewardedAd: boolean;
  pendingAds: Array<"interstitial" | "rewarded" | "gameOver" | "levelUp">;
  isShowingAd: boolean;
  processingAdRequest: boolean;
}

interface UseAdsProps {
  user: User;
  previousEvent: Event | null;
  allEvents: Event[] | null;
  pendingAdDisplay?: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null;
  setUser: (updater: (prev: User) => User) => void;
  resetTimer: (time?: number, skipNextMalus?: boolean) => void;
  setIsGameOver: (isGameOver: boolean) => void;
  setIsLevelPaused: (isPaused: boolean) => void;
  setIsWaitingForCountdown: (isWaiting: boolean) => void;
  setError?: (error: string) => void;
  setPendingAdDisplay?: (display: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null) => void;
  selectNewEvent: (events: Event[], referenceEvent: Event | null) => Promise<Event | null>;
  onLevelUpAdClosed?: () => void;
}

export function useAds({
  user,
  previousEvent,
  allEvents,
  pendingAdDisplay,
  setUser,
  resetTimer,
  setIsGameOver,
  setIsLevelPaused,
  setIsWaitingForCountdown,
  setError,
  setPendingAdDisplay,
  selectNewEvent,
  onLevelUpAdClosed
}: UseAdsProps) {

  const [adState, setAdState] = useState<AdState>({
    interstitialLoaded: false,
    gameOverInterstitialLoaded: false,
    levelUpInterstitialLoaded: false,
    rewardedLoaded: false,
    lastInterstitialTime: 0,
    hasWatchedRewardedAd: false,
    pendingAds: [],
    isShowingAd: false,
    processingAdRequest: false
  });

  const checkPendingAdsRef = useRef<(() => void) | null>(null);
  const adProcessingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initCheckPendingAds = useCallback(() => {
    return () => {
      if (adState.isShowingAd || adState.processingAdRequest) {
        // console.log("[useAds] checkPendingAds: Skipping, ad is showing or request is being processed.");
        return;
      }

      setAdState(prev => {
        if (prev.pendingAds.length === 0) {
          // console.log("[useAds] checkPendingAds: No pending ads.");
          return prev;
        }

        const nextAd = prev.pendingAds[0];
        const remaining = prev.pendingAds.slice(1);
        // console.log(`[useAds] Processing next ad in queue: ${nextAd}. Remaining: ${remaining.length}`);

        if (setPendingAdDisplay) {
          setTimeout(() => {
            // console.log(`[useAds] Setting pendingAdDisplay to: ${nextAd}`);
            setPendingAdDisplay(nextAd);
          }, 750);
          return { ...prev, pendingAds: remaining, processingAdRequest: true };
        } else {
          // console.warn("[useAds] setPendingAdDisplay is not provided, cannot process ad queue.");
          return prev;
        }
      });
    };
  }, [setPendingAdDisplay, adState.isShowingAd, adState.processingAdRequest]);

  useEffect(() => {
    checkPendingAdsRef.current = initCheckPendingAds();
  }, [initCheckPendingAds]);

  const safeCheckPendingAds = useCallback(() => {
    if (adProcessingTimeoutRef.current) {
      clearTimeout(adProcessingTimeoutRef.current);
    }

    adProcessingTimeoutRef.current = setTimeout(() => {
      setAdState(prev => ({ ...prev, processingAdRequest: false }));
      if (checkPendingAdsRef.current) {
        checkPendingAdsRef.current();
      } else {
        // console.warn('[useAds] safeCheckPendingAds called but checkPendingAdsRef.current is null');
      }
    }, 500);
  }, []);

  const canShowAd = useCallback((adType: 'levelUp' | 'gameOver' | 'generic' = 'generic') => {
    if (adState.isShowingAd) {
      // console.log(`[useAds] canShowAd (${adType}): Blocked, an ad is already showing.`);
      return false;
    }

    const currentLevel = user?.level || 0;

    if (adType === 'gameOver') {
      // console.log(`[useAds] canShowAd (${adType}): Always true for game over (level: ${currentLevel})`);
      return true;
    }

    if (adType === 'levelUp' && (currentLevel === 1 || currentLevel === 6 || currentLevel % 5 === 0)) {
      // console.log(`[useAds] canShowAd (${adType}): True for special level (level: ${currentLevel})`);
      return true;
    }

    const timeSinceLastAd = Date.now() - adState.lastInterstitialTime;
    const MIN_INTERVAL_MS = 3 * 60 * 1000;
    const timeLimitPassed = timeSinceLastAd >= MIN_INTERVAL_MS;

    // console.log(`[useAds] canShowAd (${adType}): ${timeLimitPassed} (Time since last ad: ${Math.round(timeSinceLastAd/1000)}s, Level: ${currentLevel})`);
    return timeLimitPassed;
  }, [adState.lastInterstitialTime, adState.isShowingAd, user?.level]);

  useEffect(() => {
    const getCurrentLevelForLog = (): number => {
      return user?.level || 0;
    };

    const unsubGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      // console.log("[useAds] Generic Interstitial loaded successfully");
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'generic', getCurrentLevelForLog());
    });

    const unsubGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      // console.error(`[useAds] Generic Interstitial failed to load: ${error.message}`);
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'generic', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `Generic Interstitial: ${error.message}`, 'useAds');
      setTimeout(() => { genericInterstitial.load(); }, 30000);
    });

    const unsubGenericOpened = genericInterstitial.addAdEventListener(AdEventType.OPENED, () => {
      // console.log("[useAds] Generic Interstitial opened");
      setIsLevelPaused(true);
      FirebaseAnalytics.ad('interstitial', 'opened', 'generic', getCurrentLevelForLog());
    });

    const unsubGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // console.log("[useAds] Generic Interstitial closed");
      setAdState(prev => ({
        ...prev,
        interstitialLoaded: false,
        lastInterstitialTime: Date.now(),
        isShowingAd: false
      }));
      genericInterstitial.load();
      setIsLevelPaused(false);
      resetTimer(20);
      FirebaseAnalytics.ad('interstitial', 'closed', 'generic', getCurrentLevelForLog());
      setTimeout(safeCheckPendingAds, 500);
    });

    const unsubLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      // console.log("[useAds] LevelUp Interstitial loaded successfully");
      setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'level_up', getCurrentLevelForLog());
    });

    const unsubLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      // console.error(`[useAds] LevelUp Interstitial failed to load: ${error.message}`);
      setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'level_up', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `LevelUp Interstitial: ${error.message}`, 'useAds');
      setTimeout(() => { levelUpInterstitial.load(); }, 30000);
    });

    const unsubLevelUpOpened = levelUpInterstitial.addAdEventListener(AdEventType.OPENED, () => {
      // console.log("[useAds] LevelUp Interstitial opened");
      setIsLevelPaused(true);
      FirebaseAnalytics.ad('interstitial', 'opened', 'level_up', getCurrentLevelForLog());
    });

    const unsubLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // console.log("[useAds] LevelUp Ad Closed");
      setAdState(prev => ({
        ...prev,
        levelUpInterstitialLoaded: false,
        lastInterstitialTime: Date.now(),
        isShowingAd: false
      }));
      levelUpInterstitial.load();
      FirebaseAnalytics.ad('interstitial', 'closed', 'level_up', getCurrentLevelForLog());
      if (onLevelUpAdClosed) {
        // console.log("[useAds] Calling onLevelUpAdClosed callback.");
        onLevelUpAdClosed();
      } else {
        // console.warn("[useAds] LevelUp Ad Closed, but no onLevelUpAdClosed callback provided.");
      }
      setTimeout(safeCheckPendingAds, 500);
    });

    const unsubGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      // console.log("[useAds] GameOver Interstitial loaded successfully");
      setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'game_over', getCurrentLevelForLog());
    });

    const unsubGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      // console.error(`[useAds] GameOver Interstitial failed to load: ${error.message}`);
      setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'game_over', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `GameOver Interstitial: ${error.message}`, 'useAds');
      setTimeout(() => { gameOverInterstitial.load(); }, 30000);
    });

    const unsubGameOverOpened = gameOverInterstitial.addAdEventListener(AdEventType.OPENED, () => {
      // console.log("[useAds] GameOver Interstitial opened");
      FirebaseAnalytics.ad('interstitial', 'opened', 'game_over', getCurrentLevelForLog());
    });

    const unsubGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // console.log("[useAds] GameOver Interstitial closed");
      setAdState(prev => ({
        ...prev,
        gameOverInterstitialLoaded: false,
        lastInterstitialTime: Date.now(),
        isShowingAd: false
      }));
      gameOverInterstitial.load();
      FirebaseAnalytics.ad('interstitial', 'closed', 'game_over', getCurrentLevelForLog());
      setTimeout(safeCheckPendingAds, 500);
    });

    const unsubRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      // console.log("[useAds] Rewarded ad loaded successfully");
      setAdState(prev => ({ ...prev, rewardedLoaded: true }));
      FirebaseAnalytics.ad('rewarded', 'loaded', 'extra_life', getCurrentLevelForLog());
    });

    const unsubRewardedError = rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
      // console.error(`[useAds] Rewarded ad failed to load: ${error.message}`);
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      FirebaseAnalytics.ad('rewarded', 'failed', 'extra_life', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `Rewarded Ad: ${error.message}`, 'useAds');
      setTimeout(() => { rewardedAd.load(); }, 30000);
    });

    const unsubRewardedOpened = rewardedAd.addAdEventListener(AdEventType.OPENED, () => {
      // console.log("[useAds] Rewarded ad opened");
      setIsLevelPaused(true);
      FirebaseAnalytics.ad('rewarded', 'opened', 'extra_life', getCurrentLevelForLog());
    });

    const unsubRewardedClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      // console.log("[useAds] Rewarded ad closed");
      setAdState(prev => {
        if (prev.hasWatchedRewardedAd && !prev.isShowingAd) {
          // console.log("[useAds] Rewarded ad closed after reward was earned. No action needed here.");
          return prev;
        }
        // console.log("[useAds] Rewarded ad closed WITHOUT earning reward (or before reward processed).");
        FirebaseAnalytics.ad('rewarded', 'closed_without_reward', 'extra_life', getCurrentLevelForLog());
        const newState = { ...prev, rewardedLoaded: false, isShowingAd: false };
        setIsLevelPaused(false);
        resetTimer(20);
        rewardedAd.load();
        setTimeout(safeCheckPendingAds, 500);
        return newState;
      });
    });

    const unsubRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      // console.log("[useAds] User earned reward:", reward);
      const currentLevel = getCurrentLevelForLog();
      const currentPoints = user?.points || 0;

      setAdState(prev => ({ ...prev, hasWatchedRewardedAd: true, rewardedLoaded: false, isShowingAd: false }));

      FirebaseAnalytics.ad('rewarded', 'earned_reward', 'extra_life', currentLevel);
      const rewardType = reward?.type || 'unknown_reward_type';
      const rewardAmount = reward?.amount || 0;
      if (rewardType === RewardType.EXTRA_LIFE || rewardType === 'coins' || rewardAmount > 0) {
        FirebaseAnalytics.reward(RewardType.EXTRA_LIFE, 1, 'ad_reward', 'completed', currentLevel, currentPoints);
      } else {
        FirebaseAnalytics.reward(rewardType, rewardAmount, 'ad_reward_unexpected', 'completed', currentLevel, currentPoints);
        // console.warn(`[useAds] Unexpected reward type or amount: ${rewardType}, ${rewardAmount}`);
      }

      const grantRewardAndContinue = async () => {
        // console.log("[useAds] Applying reward and resuming game...");
        setIsGameOver(false);
        try {
          await new Promise<void>((resolve, reject) => {
            setUser(prevUser => {
              if (!prevUser) {
                reject(new Error("User state is null, cannot grant reward."));
                return prevUser;
              }
              const currentLives = prevUser.lives;
              const livesToAdd = 1;
              // console.log(`[useAds] Granting life. Current: ${currentLives}, New: ${Math.min(currentLives + livesToAdd, MAX_LIVES)}`);
              return { ...prevUser, lives: Math.min(currentLives + livesToAdd, MAX_LIVES) };
            });
            setTimeout(resolve, 150);
          });
        } catch (updateError) {
          // console.error("[useAds] Error updating user state after reward:", updateError);
          if (setError) setError("Erreur lors de l'application de la récompense.");
          setIsLevelPaused(false);
          return;
        }

        setIsLevelPaused(false);
        setIsWaitingForCountdown(false);
        // console.log("[useAds] Resetting timer without penalty after reward.");
        resetTimer(20, true);

        if (allEvents && previousEvent) {
          // console.log("[useAds] Selecting new event after reward.");
          try {
            const nextEvent = await selectNewEvent(allEvents, previousEvent);
            if (!nextEvent) {
              // console.warn("[useAds] Failed to select next event after reward, potentially end of game.");
              setIsGameOver(true);
              setIsLevelPaused(true);
              if (setError) setError('Impossible de sélectionner l\'événement suivant après la récompense.');
            } else {
              // console.log("[useAds] New event selected successfully after reward.");
            }
          } catch (err) {
            // console.error("[useAds] Error selecting next event after reward:", err);
            setIsGameOver(true);
            setIsLevelPaused(true);
            if (setError) setError('Erreur lors de la reprise du jeu après la publicité.');
            FirebaseAnalytics.error('rewarded_resume_error', err instanceof Error ? err.message : String(err), 'useAds:EARNED_REWARD');
          }
        } else {
          // console.warn("[useAds] Missing allEvents or previousEvent, cannot select new event after reward.");
        }

        // console.log("[useAds] Reloading rewarded ad after reward process.");
        rewardedAd.load();
        setTimeout(safeCheckPendingAds, 500);
      };
      grantRewardAndContinue();
    });

    // console.log("[useAds] Initializing ad listeners and loading ads if needed...");
    if (!genericInterstitial.loaded && !adState.interstitialLoaded) { /* console.log("[useAds] Loading initial Generic Interstitial."); */ genericInterstitial.load(); }
    if (!levelUpInterstitial.loaded && !adState.levelUpInterstitialLoaded) { /* console.log("[useAds] Loading initial LevelUp Interstitial."); */ levelUpInterstitial.load(); }
    if (!gameOverInterstitial.loaded && !adState.gameOverInterstitialLoaded) { /* console.log("[useAds] Loading initial GameOver Interstitial."); */ gameOverInterstitial.load(); }
    if (!rewardedAd.loaded && !adState.rewardedLoaded) { /* console.log("[useAds] Loading initial Rewarded Ad."); */ rewardedAd.load(); }

    return () => {
      // console.log("[useAds] Cleaning up ad listeners.");
      unsubGenericLoaded(); unsubGenericError(); unsubGenericOpened(); unsubGenericClosed();
      unsubLevelUpLoaded(); unsubLevelUpError(); unsubLevelUpOpened(); unsubLevelUpClosed();
      unsubGameOverLoaded(); unsubGameOverError(); unsubGameOverOpened(); unsubGameOverClosed();
      unsubRewardedLoaded(); unsubRewardedError(); unsubRewardedOpened(); unsubRewardedClosed(); unsubRewardedEarned();

      if (adProcessingTimeoutRef.current) {
        clearTimeout(adProcessingTimeoutRef.current);
      }
    };
  }, [
    user,
    allEvents, previousEvent,
    setUser, resetTimer, setIsGameOver, setIsLevelPaused, setIsWaitingForCountdown, setError, selectNewEvent, onLevelUpAdClosed,
    safeCheckPendingAds
  ]);

  const requestAdDisplay = useCallback((adType: "interstitial" | "rewarded" | "gameOver" | "levelUp") => {
    // console.log(`[useAds] Requesting ad display for: ${adType}`);
    if (setPendingAdDisplay) {
      setAdState(prev => {
        if (prev.isShowingAd || prev.pendingAds.length > 0 || prev.processingAdRequest) {
          // console.log(`[useAds] Ad is showing or queue not empty. Adding ${adType} to queue.`);
          const existingAdIndex = prev.pendingAds.findIndex(ad => ad === adType);
          if (existingAdIndex !== -1) {
            // console.log(`[useAds] Ad type ${adType} already in queue, not adding duplicate.`);
            return prev;
          }
          return { ...prev, pendingAds: [...prev.pendingAds, adType] };
        } else {
          // console.log(`[useAds] No ad showing and queue empty. Setting ${adType} as pending display.`);
          setTimeout(() => setPendingAdDisplay(adType), 0);
          return { ...prev, processingAdRequest: true };
        }
      });
    } else {
      // console.error("[useAds] Cannot request ad display: setPendingAdDisplay is not available.");
    }
  }, [setPendingAdDisplay]);

  const showRewardedAd = useCallback(() => {
    const currentLevel = user?.level || 0;
    if (adState.hasWatchedRewardedAd) {
      // console.warn("[useAds] Rewarded ad request blocked: already watched in this session/level.");
      FirebaseAnalytics.ad('rewarded', 'blocked', 'already_watched', currentLevel);
      if(setError) setError("Vous avez déjà utilisé l'aide pour ce niveau.");
      return false;
    }
    if (!adState.rewardedLoaded) {
      // console.warn("[useAds] Rewarded ad request: Ad not loaded yet. Attempting to load.");
      FirebaseAnalytics.ad('rewarded', 'not_available', 'user_request_extra_life', currentLevel);
      rewardedAd.load();
      if(setError) setError("L'aide vidéo n'est pas encore prête. Réessayez dans quelques instants.");
      return false;
    }
    FirebaseAnalytics.ad('rewarded', 'request_display', 'user_request_extra_life', currentLevel);
    requestAdDisplay('rewarded');
    return true;
  }, [adState.hasWatchedRewardedAd, adState.rewardedLoaded, user?.level, requestAdDisplay, setError]);

  const showGenericInterstitial = useCallback(() => {
    FirebaseAnalytics.ad('interstitial', 'request_display', 'generic', user?.level || 0);
    requestAdDisplay('interstitial');
    return true;
  }, [requestAdDisplay, user?.level]);

  const showLevelUpInterstitial = useCallback(() => {
    FirebaseAnalytics.ad('interstitial', 'request_display', 'level_up', user?.level || 0);
    requestAdDisplay('levelUp');
    return true;
  }, [requestAdDisplay, user?.level]);

  const showGameOverInterstitial = useCallback(() => {
    FirebaseAnalytics.ad('interstitial', 'request_display', 'game_over', user?.level || 0);
    requestAdDisplay('gameOver');
    return true;
  }, [requestAdDisplay, user?.level]);

  useEffect(() => {
    if (!pendingAdDisplay || !setPendingAdDisplay) {
      return;
    }

    // console.log(`[useAds Effect] Processing pendingAdDisplay: ${pendingAdDisplay}. Current state: isShowingAd=${adState.isShowingAd}, pendingAds=${adState.pendingAds.length}`);

    if (adState.isShowingAd) {
      // console.log(`[useAds Effect] Ad already showing, ignoring trigger for ${pendingAdDisplay}. It might be queued.`);
      setAdState(prev => {
        if (!prev.pendingAds.includes(pendingAdDisplay)) {
          // console.log(`[useAds Effect] Adding ${pendingAdDisplay} to pendingAds queue.`);
          return { ...prev, pendingAds: [...prev.pendingAds, pendingAdDisplay] };
        }
        return prev;
      });
      setPendingAdDisplay(null);
      return;
    }

    let adShown = false;
    let adTypeToClear: typeof pendingAdDisplay | null = pendingAdDisplay;
    const currentLevel = user?.level || 0;

    try {
      setAdState(prev => ({ ...prev, isShowingAd: true, processingAdRequest: false }));
      // console.log(`[useAds Effect] Set isShowingAd = true for ${adTypeToClear}`);

      if (adTypeToClear === 'levelUp') {
        if (canShowAd('levelUp')) {
          if (adState.levelUpInterstitialLoaded) {
            // console.log("[useAds Effect] Showing LevelUp Interstitial.");
            FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', currentLevel);
            levelUpInterstitial.show();
            adShown = true;
          } else if (adState.interstitialLoaded) {
            // console.log("[useAds Effect] LevelUp not loaded, showing Generic Interstitial as fallback.");
            FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up_fallback', currentLevel);
            genericInterstitial.show();
            adShown = true;
          } else {
            // console.warn("[useAds Effect] No LevelUp or Generic ad loaded for LevelUp trigger.");
            FirebaseAnalytics.ad('interstitial', 'not_available', 'level_up', currentLevel);
            if (!levelUpInterstitial.loaded) levelUpInterstitial.load();
            if (!genericInterstitial.loaded) genericInterstitial.load();
          }
        } else {
          // console.log("[useAds Effect] LevelUp Interstitial blocked by rate limit/condition.");
          FirebaseAnalytics.ad('interstitial', 'blocked', 'rate_limit_level_up', currentLevel);
          adTypeToClear = null;
        }
      } else if (adTypeToClear === 'gameOver') {
        if (canShowAd('gameOver')) {
          if (adState.gameOverInterstitialLoaded) {
            // console.log("[useAds Effect] Showing GameOver Interstitial.");
            FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over', currentLevel);
            gameOverInterstitial.show();
            adShown = true;
          } else if (adState.interstitialLoaded) {
            // console.log("[useAds Effect] GameOver not loaded, showing Generic Interstitial as fallback.");
            FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over_fallback', currentLevel);
            genericInterstitial.show();
            adShown = true;
          } else {
            // console.warn("[useAds Effect] No GameOver or Generic ad loaded for GameOver trigger.");
            FirebaseAnalytics.ad('interstitial', 'not_available', 'game_over', currentLevel);
            if (!gameOverInterstitial.loaded) gameOverInterstitial.load();
            if (!genericInterstitial.loaded) genericInterstitial.load();
          }
        } else {
          // console.error("[useAds Effect] GameOver Interstitial blocked unexpectedly!");
          adTypeToClear = null;
        }
      } else if (adTypeToClear === 'interstitial') {
        if (canShowAd('generic')) {
          if (adState.interstitialLoaded) {
            // console.log("[useAds Effect] Showing Generic Interstitial.");
            FirebaseAnalytics.ad('interstitial', 'triggered', 'generic', currentLevel);
            genericInterstitial.show();
            adShown = true;
          } else {
            // console.warn("[useAds Effect] Generic Interstitial not loaded for generic trigger.");
            FirebaseAnalytics.ad('interstitial', 'not_available', 'generic', currentLevel);
            if (!genericInterstitial.loaded) genericInterstitial.load();
          }
        } else {
          // console.log("[useAds Effect] Generic Interstitial blocked by rate limit/condition.");
          FirebaseAnalytics.ad('interstitial', 'blocked', 'rate_limit_generic', currentLevel);
          adTypeToClear = null;
        }
      } else if (adTypeToClear === 'rewarded') {
        if (adState.rewardedLoaded) {
          // console.log("[useAds Effect] Showing Rewarded Ad.");
          FirebaseAnalytics.ad('rewarded', 'triggered', 'user_request_extra_life', currentLevel);
          rewardedAd.show();
          adShown = true;
        } else {
          // console.warn("[useAds Effect] Rewarded Ad was requested but is not loaded anymore.");
          FirebaseAnalytics.ad('rewarded', 'not_available', 'user_request_extra_life', currentLevel);
          if (!rewardedAd.loaded) rewardedAd.load();
          if (setError) setError("L'aide vidéo n'a pas pu être chargée à temps.");
        }
      }

      if (!adShown) {
        // console.log(`[useAds Effect] Ad ${pendingAdDisplay} could not be shown. Resetting isShowingAd.`);
        setAdState(prev => ({ ...prev, isShowingAd: false, processingAdRequest: false }));
        setTimeout(safeCheckPendingAds, 300);
      }
      } catch (error) {
        // console.error(`[useAds Effect] Error showing ad ${pendingAdDisplay}:`, error);
        const adName = pendingAdDisplay === 'rewarded' ? 'Rewarded Ad' : `${pendingAdDisplay} Interstitial`;
        FirebaseAnalytics.ad(pendingAdDisplay === 'rewarded' ? 'rewarded' : 'interstitial', 'error_show', pendingAdDisplay, currentLevel);
        FirebaseAnalytics.error('ad_show_error', `${adName}: ${error instanceof Error ? error.message : String(error)}`, 'useAds:Effect');
        setAdState(prev => ({ ...prev, isShowingAd: false, processingAdRequest: false }));

        try {
          if (pendingAdDisplay === 'levelUp' && !levelUpInterstitial.loaded) levelUpInterstitial.load();
          else if (pendingAdDisplay === 'gameOver' && !gameOverInterstitial.loaded) gameOverInterstitial.load();
          else if (pendingAdDisplay === 'interstitial' && !genericInterstitial.loaded) genericInterstitial.load();
          else if (pendingAdDisplay === 'rewarded' && !rewardedAd.loaded) rewardedAd.load();
        } catch (loadError) {
          // console.error(`[useAds Effect] Error trying to reload ad after show error:`, loadError);
        }

        setTimeout(safeCheckPendingAds, 300);
        adTypeToClear = pendingAdDisplay;
      } finally {
        if (adTypeToClear && setPendingAdDisplay) {
          // console.log(`[useAds Effect] Clearing pendingAdDisplay: ${adTypeToClear}`);
          setPendingAdDisplay(null);
        }
      }
      }, [
      pendingAdDisplay,
      setPendingAdDisplay,
      adState.interstitialLoaded,
      adState.levelUpInterstitialLoaded,
      adState.gameOverInterstitialLoaded,
      adState.rewardedLoaded,
      adState.isShowingAd,
      canShowAd,
      safeCheckPendingAds,
      user?.level,
      setError
      ]);

  // --- DÉBUT MODIFICATION DE resetAdsState ---
  const resetAdsState = useCallback(() => {
    console.log("[useAds] Resetting ads state (clearing lastInterstitialTime, hasWatchedRewardedAd, and pending ads)");
    
    // Réinitialiser tous les états liés aux publicités
    setAdState(prev => ({
      ...prev,
      interstitialLoaded: false,
      gameOverInterstitialLoaded: false,
      levelUpInterstitialLoaded: false,
      rewardedLoaded: false,
      hasWatchedRewardedAd: false,
      lastInterstitialTime: 0,
      pendingAds: [],
      isShowingAd: false,
      processingAdRequest: false
    }));

    try {
      // Force le rechargement de toutes les instances d'annonces
      console.log("[useAds] Forcing reload of all ad instances after reset...");
      
      // Tenter de vider les pubs actuellement chargées
      // Note: ces tentatives peuvent échouer, d'où le try/catch et l'utilisation de .catch(() => {})
      if (genericInterstitial.loaded) {
        try { genericInterstitial.show().catch(() => {}); } catch (e) {}
      }
      if (levelUpInterstitial.loaded) {
        try { levelUpInterstitial.show().catch(() => {}); } catch (e) {}
      }
      if (gameOverInterstitial.loaded) {
        try { gameOverInterstitial.show().catch(() => {}); } catch (e) {}
      }
      if (rewardedAd.loaded) {
        try { rewardedAd.show().catch(() => {}); } catch (e) {}
      }
      
      // Recharge toutes les pubs après un délai pour permettre aux précédentes de se terminer
      setTimeout(() => {
        try {
          genericInterstitial.load();
          levelUpInterstitial.load();
          gameOverInterstitial.load();
          rewardedAd.load();
          console.log("[useAds] All ad instances explicitly triggered to reload.");
        } catch (reloadError) {
          console.error("[useAds] Error in delayed ad reload:", reloadError);
        }
      }, 500);
    } catch (error) {
      console.error("[useAds] Error attempting to reload ads during reset:", error);
      FirebaseAnalytics.error('ad_reset_reload_error', error instanceof Error ? error.message : String(error), 'useAds:resetAdsState');
      
      // Même en cas d'erreur, tenter quand même de recharger les pubs après un délai
      setTimeout(() => {
        try {
          genericInterstitial.load();
          levelUpInterstitial.load();
          gameOverInterstitial.load();
          rewardedAd.load();
        } catch (e) {
          // Ignorer silencieusement les erreurs ici
        }
      }, 1000);
    }
  }, []);
  // --- FIN MODIFICATION DE resetAdsState ---

  return {
      adState: {
        interstitialLoaded: adState.interstitialLoaded,
        levelUpInterstitialLoaded: adState.levelUpInterstitialLoaded,
        gameOverInterstitialLoaded: adState.gameOverInterstitialLoaded,
        rewardedLoaded: adState.rewardedLoaded,
        isShowingAd: adState.isShowingAd,
        hasWatchedRewardedAd: adState.hasWatchedRewardedAd,
      },
      canShowAd,
      showRewardedAd,
      showGenericInterstitial,
      showLevelUpInterstitial,
      showGameOverInterstitial,
      resetAdsState,
  };
}
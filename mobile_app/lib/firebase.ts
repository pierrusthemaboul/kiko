import {
  getAnalytics,
  logAppOpen,
  logEvent,
  setUserId,
  setUserProperties,
  setUserProperty,
} from '@react-native-firebase/analytics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { recordNonFatal, setUserId as setCrashlyticsUserId } from './crash';
import { logToReactotron } from '../ReactotronConfig';

const analyticsInstance = getAnalytics();

type KnownAnalyticsEvents = {
  login_failed: {
    reason: string;
    method?: 'password' | 'google';
    screen?: string;
    context?: string;
    message?: string;
    error_code?: string;
  };
  signup_failed: {
    reason: string;
    method?: 'password' | 'google';
    screen?: string;
    context?: string;
    message?: string;
    error_code?: string;
  };
  life_lost: {
    reason: string;
    level: number;
    remaining_lives: number;
    event_id?: string;
    context?: string;
  };
  ad_event: {
    placement: string;
    action: string;
    ad_type?: string;
    level?: number;
    reward_type?: string;
    reward_amount?: number;
    error_code?: string;
    network?: string;
  };
  event_selected: {
    event_id: string;
    event_year: number;
    event_period: string;
    event_notoriete: number;
    time_gap_years: number;
    configured_base_gap: number;
    configured_min_gap: number;
    level: number;
    is_temporal_jump?: boolean;
    is_bonus_event?: boolean;
    is_anti_frustration?: boolean;
    pool_tier?: number;
    selection_path?: string;
  };
  app_backgrounded_during_game: {
    event_id: string;
    level?: number;
    reason?: string;
    screen?: string;
    streak?: number;
    seconds_since_last?: number;
    context?: string;
  };
  error_occurred: {
    code: string;
    message?: string;
    screen?: string;
    context?: string;
    severity?: 'warning' | 'error';
  };
  consent_status_updated: {
    status: string;
    can_show_personalized_ads: boolean;
    source: 'restore' | 'update';
  };
  consent_form_shown: {
    status: string;
    source: 'auto' | 'manual';
  };
  consent_form_error: {
    status: string;
    error_code?: string;
    message?: string;
  };
  quest_claimed: {
    quest_key: string;
    xp_reward: number;
    parts_reward: number;
    quest_type: string;
  };
  quest_rerolled: {
    old_quest_key: string;
    new_quest_key: string;
    difficulty_tier: number;
  };
  quest_completed: {
    quest_key: string;
    quest_type: string;
  };
  achievement_unlocked: {
    achievement_key: string;
    xp_bonus: number;
  };
};

type AnalyticsEventName = keyof KnownAnalyticsEvents | (string & {});

type AnalyticsEventParams<N extends AnalyticsEventName> = N extends keyof KnownAnalyticsEvents
  ? KnownAnalyticsEvents[N]
  : Record<string, unknown>;

type AnalyticsUserProperties = {
  membership_status?: 'guest' | 'registered';
  has_personalized_ads?: 'true' | 'false';
  display_name?: string;
  locale?: string;
  app_version?: string;
  platform?: string;
  [key: string]: string | number | boolean | null | undefined;
};

type AdExtras = Omit<KnownAnalyticsEvents['ad_event'], 'placement' | 'action'>;

function sanitizePrimitive(value: unknown) {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return typeof value === 'string' ? value.slice(0, 100) : value;
  }
  if (typeof value === 'undefined') {
    return undefined;
  }
  try {
    return JSON.stringify(value).slice(0, 100);
  } catch {
    return String(value).slice(0, 100);
  }
}

function sanitizeParams(params?: Record<string, unknown>) {
  if (!params) {
    return undefined;
  }
  const result: Record<string, string | number | boolean | null> = {};
  Object.entries(params).forEach(([key, value]) => {
    const sanitized = sanitizePrimitive(value);
    if (typeof sanitized !== 'undefined') {
      result[key] = sanitized as string | number | boolean | null;
    }
  });
  return result;
}

function sanitizeUserProps(props: AnalyticsUserProperties) {
  const result: Record<string, string | null> = {};
  Object.entries(props).forEach(([key, value]) => {
    if (typeof value === 'undefined') {
      return;
    }
    if (value === null) {
      result[key] = null;
      return;
    }
    result[key] = String(value).slice(0, 36);
  });
  return result;
}

export async function initializeAnalytics(userId?: string, isGuest = false) {
  try {
    if (userId) {
      await setUserId(analyticsInstance, userId);
      await setCrashlyticsUserId(userId);
    } else {
      await setUserId(analyticsInstance, null);
      await setCrashlyticsUserId(null);
    }
    await setUserProperties(
      analyticsInstance,
      sanitizeUserProps({
        membership_status: isGuest ? 'guest' : 'registered',
        app_version: Constants.expoConfig?.version ?? 'unknown',
        platform: Platform.OS,
      }),
    );
  } catch (error) {
    console.error('initializeAnalytics failed', error);
  }
}

export async function trackScreen(screenName: string, screenClass?: string) {
  try {
    const name = screenName || 'unknown';
    // Utiliser logEvent au lieu de logScreenView (deprecated)
    await logEvent(analyticsInstance, 'screen_view' as any, {
      screen_name: name,
      screen_class: screenClass || name,
    });
  } catch (error) {
    console.error('trackScreen failed', error);
  }
}

export async function trackAppOpen() {
  try {
    // logAppOpen est obsolète, on utilise logEvent('app_open')
    await logEvent(analyticsInstance, 'app_open' as any);
  } catch (error) {
    console.error('trackAppOpen failed', error);
  }
}

export async function trackAppState(
  state: 'background' | 'active',
  extras?: { time_left?: number; current_level?: number; current_score?: number },
) {
  const name = state === 'background' ? 'app_backgrounded' : 'app_foregrounded';
  try {
    await logEvent(analyticsInstance, name, sanitizeParams(extras));
  } catch (error) {
    console.error('trackAppState failed', error);
  }
}

export async function trackEvent<N extends AnalyticsEventName>(
  name: N,
  params?: AnalyticsEventParams<N>,
) {
  try {
    if (__DEV__) {
      logToReactotron(name as string, params);
    }
    await logEvent(analyticsInstance, name as any, sanitizeParams(params));
  } catch (error) {
    console.error(`trackEvent failed for ${name}`, error);
  }
}

export async function trackAd(
  placement: string,
  action: string,
  extra?: AdExtras,
) {
  await trackEvent('ad_event', {
    placement,
    action,
    ...(extra ?? {}),
  });
}

export async function setUserProps(props: AnalyticsUserProperties) {
  try {
    await setUserProperties(analyticsInstance, sanitizeUserProps(props));
  } catch (error) {
    console.error('setUserProps failed', error);
  }
}

export async function trackError(
  code: string,
  context: {
    message?: string;
    screen?: string;
    context?: string;
    severity?: 'warning' | 'error';
  } = {},
) {
  await trackEvent('error_occurred', {
    code,
    severity: context.severity ?? 'error',
    message: context.message,
    screen: context.screen,
    context: context.context,
  });
  await recordNonFatal(
    context.message ? new Error(context.message) : new Error(code),
    {
      code,
      screen: context.screen,
      context: context.context,
      severity: context.severity ?? 'error',
    },
  );
}

const legacyAnalytics = {
  initialize: initializeAnalytics,
  screen: trackScreen,
  appOpen: trackAppOpen,
  appState: trackAppState,
  trackEvent,
  trackAd,
  setUserProps,
  trackError,
  logEvent: trackEvent,
  ad: async (adType: string, action: string, placement: string, level?: number) => {
    await trackAd(placement, action, { ad_type: adType, level });
  },
  error: async (code: string, message: string, screen: string) => {
    await trackError(code, { message, screen });
  },
  setUserProperty: async (key: string, value: unknown) => {
    await setUserProps({ [key]: (value === null ? null : value) as any });
  },
  gameStarted: async (playerName: string | null, isGuest: boolean, initialLevel: number) => {
    await trackEvent('game_started', {
      player_name: playerName || 'Anonymous',
      is_guest: isGuest,
      initial_level: initialLevel,
    });
  },
  levelStarted: async (
    levelId: number,
    levelName: string,
    eventsNeeded: number,
    currentScore: number,
  ) => {
    await trackEvent('level_started', {
      level_id: levelId,
      level_name: levelName || `Niveau ${levelId}`,
      events_needed: eventsNeeded,
      current_score: currentScore,
    });
  },
  levelCompleted: async (
    levelId: number,
    levelName: string,
    eventsCompleted: number,
    correctAnswers: number,
    score: number,
  ) => {
    await trackEvent('level_completed', {
      level_id: levelId,
      level_name: levelName || `Niveau ${levelId}`,
      events_completed: eventsCompleted,
      correct_answers: correctAnswers,
      score,
    });
  },
  question: async (
    eventId: string,
    eventTitle: string,
    eventPeriod: string,
    eventDifficulty: number | undefined,
    choice: string,
    isCorrect: boolean,
    responseTime: number,
    levelId: number,
    currentStreak: number,
  ) => {
    await trackEvent('question_answered', {
      event_id: eventId,
      event_title: eventTitle?.slice(0, 100),
      event_period: eventPeriod,
      event_difficulty: eventDifficulty ?? 0,
      choice,
      is_correct: isCorrect,
      response_time: Math.round(responseTime),
      level_id: levelId,
      current_streak: currentStreak,
    });
  },
  streak: async (streakCount: number, levelId: number) => {
    if (streakCount === 0 || streakCount % 5 !== 0) {
      return;
    }
    await trackEvent('streak_achieved', {
      streak_count: streakCount,
      level_id: levelId,
    });
  },
  gameOver: async (
    finalScore: number,
    maxLevel: number,
    totalEventsCompleted: number,
    maxStreak: number,
    isHighScore: boolean,
  ) => {
    await trackEvent('game_over', {
      final_score: finalScore,
      max_level: maxLevel,
      total_events_completed: totalEventsCompleted,
      max_streak: maxStreak,
      is_high_score: isHighScore,
    });
  },
  reward: async (
    rewardType: string,
    rewardAmount: number,
    trigger: string,
    triggerValue: number | string,
    levelId: number,
    currentScore: number,
  ) => {
    await trackEvent('reward_earned', {
      reward_type: rewardType,
      reward_amount: rewardAmount,
      trigger_event: trigger,
      trigger_value: triggerValue,
      level_id: levelId,
      current_score: currentScore,
    });
  },
  leaderboard: async (leaderboardType: string) => {
    await trackEvent('leaderboard_viewed', {
      leaderboard_type: leaderboardType,
    });
  },
  disclaimer: async () => {
    await trackEvent('disclaimer_viewed');
  },
  newHighScore: async (oldScore: number, newScore: number) => {
    await trackEvent('new_high_score', {
      score: newScore,
    });
  },
  eventSelected: async (params: {
    eventId: string;
    eventYear: number;
    eventPeriod: string;
    eventNotoriete: number;
    timeGapYears: number;
    configuredBaseGap: number;
    configuredMinGap: number;
    level: number;
    isTemporalJump?: boolean;
    isBonusEvent?: boolean;
    isAntiFrustration?: boolean;
    poolTier?: number;
    selectionPath?: string;
  }) => {
    await trackEvent('event_selected', {
      event_id: params.eventId,
      event_year: params.eventYear,
      event_period: params.eventPeriod,
      event_notoriete: params.eventNotoriete,
      time_gap_years: Math.round(params.timeGapYears),
      configured_base_gap: params.configuredBaseGap,
      configured_min_gap: params.configuredMinGap,
      level: params.level,
      is_temporal_jump: params.isTemporalJump ?? false,
      is_bonus_event: params.isBonusEvent ?? false,
      is_anti_frustration: params.isAntiFrustration ?? false,
      pool_tier: params.poolTier,
      selection_path: params.selectionPath,
    });
  },
};

export const FirebaseAnalytics = legacyAnalytics;

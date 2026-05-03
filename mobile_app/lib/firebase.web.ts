// /home/pierre/sword/kiko/lib/firebase.web.ts
// Mock for Firebase Analytics on Web

export const FirebaseAnalytics = {
  initialize: async (userId?: string, isGuest = false) => {
    console.log('[Firebase Web] Mock initialize', { userId, isGuest });
  },
  screen: async (screenName: string, screenClass?: string) => {
    console.log('[Firebase Web] Mock screen', { screenName, screenClass });
  },
  appOpen: async () => {
    console.log('[Firebase Web] Mock appOpen');
  },
  appState: async (state: string, extras?: any) => {
    console.log('[Firebase Web] Mock appState', { state, extras });
  },
  trackEvent: async (name: string, params?: any) => {
    console.log('[Firebase Web] Mock trackEvent', { name, params });
  },
  trackAd: async (placement: string, action: string, extra?: any) => {
    console.log('[Firebase Web] Mock trackAd', { placement, action, extra });
  },
  setUserProps: async (props: any) => {
    console.log('[Firebase Web] Mock setUserProps', props);
  },
  trackError: async (code: string, context: any = {}) => {
    console.log('[Firebase Web] Mock trackError', { code, context });
  },
  logEvent: async (name: string, params?: any) => {
    console.log('[Firebase Web] Mock logEvent', { name, params });
  },
  ad: async (adType: string, action: string, placement: string, level?: number) => {
    console.log('[Firebase Web] Mock ad', { adType, action, placement, level });
  },
  error: async (code: string, message: string, screen: string) => {
    console.log('[Firebase Web] Mock error', { code, message, screen });
  },
  setUserProperty: async (key: string, value: any) => {
    console.log('[Firebase Web] Mock setUserProperty', { key, value });
  },
  gameStarted: async (playerName: string | null, isGuest: boolean, initialLevel: number) => {
    console.log('[Firebase Web] Mock gameStarted', { playerName, isGuest, initialLevel });
  },
  levelStarted: async (levelId: number, levelName: string, eventsNeeded: number, currentScore: number) => {
    console.log('[Firebase Web] Mock levelStarted', { levelId, levelName, eventsNeeded, currentScore });
  },
  levelCompleted: async (levelId: number, levelName: string, eventsCompleted: number, correctAnswers: number, score: number) => {
    console.log('[Firebase Web] Mock levelCompleted', { levelId, levelName, eventsCompleted, correctAnswers, score });
  },
  question: async (eventId: string, eventTitle: string, eventPeriod: string, eventDifficulty: any, choice: string, isCorrect: boolean, responseTime: number, levelId: number, currentStreak: number) => {
    console.log('[Firebase Web] Mock question', { eventId, eventTitle, isCorrect });
  },
  streak: async (streakCount: number, levelId: number) => {
    console.log('[Firebase Web] Mock streak', { streakCount, levelId });
  },
  gameOver: async (finalScore: number, maxLevel: number, totalEventsCompleted: number, maxStreak: number, isHighScore: boolean) => {
    console.log('[Firebase Web] Mock gameOver', { finalScore, maxLevel });
  },
  reward: async (rewardType: string, rewardAmount: number, trigger: string, triggerValue: any, levelId: number, currentScore: number) => {
    console.log('[Firebase Web] Mock reward', { rewardType, rewardAmount });
  },
  leaderboard: async (leaderboardType: string) => {
    console.log('[Firebase Web] Mock leaderboard', { leaderboardType });
  },
  disclaimer: async () => {
    console.log('[Firebase Web] Mock disclaimer');
  },
  newHighScore: async (oldScore: number, newScore: number) => {
    console.log('[Firebase Web] Mock newHighScore', { oldScore, newScore });
  },
  eventSelected: async (params: any) => {
    console.log('[Firebase Web] Mock eventSelected', params);
  },
};

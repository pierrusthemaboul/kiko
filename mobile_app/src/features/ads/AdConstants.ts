export const AD_TICKET_SCHEMA_VERSION = 2;

export const AD_STORAGE_KEYS = {
  pendingReward: '@pending_reward',
  rewardQuarantine: '@pending_reward_quarantine',
} as const;

export const AD_UNIT_IDS = {
  rewardedExtraPlay: 'REWARDED_EXTRA_PLAY',
  bannerHome: 'BANNER_HOME',
} as const;

export type RewardTicketStatus =
  | 'watching'
  | 'earned_pending_sync'
  | 'syncing'
  | 'synced'
  | 'aborted'
  | 'dead';

export type RewardTicketSource = 'rewarded_ad';

export type RewardTicketReason =
  | 'earned'
  | 'fallback'
  | 'manual_grant'
  | 'closed_without_reward'
  | 'watching_ticket_stale'
  | 'ttl_expired'
  | 'retry_limit_reached'
  | 'invalid_json_or_schema';

export type AdRewardTicket = {
  schemaVersion: typeof AD_TICKET_SCHEMA_VERSION;
  id: string;
  status: RewardTicketStatus;
  createdAt: number;
  updatedAt: number;
  earnedAt?: number;
  retryCount: number;
  nextRetryAt?: number;
  lastError?: string;
  expiresAt: number;
  source: RewardTicketSource;
};

export type RewardTicketResult =
  | { ok: true; ticket: AdRewardTicket }
  | { ok: false; message: string };

export type BannerPlacement = 'HOME';

export type AdLoadError = {
  code: string;
  message: string;
};

export type ConsentResetFn = () => Promise<void>;

export type ConsentResetResult =
  | { ok: true }
  | { ok: false; message: string };

export type AdInitResult =
  | { ok: true; configuredTestDevices: boolean }
  | { ok: false; message: string };

export const AD_SYNC_POLICY = {
  maxRetryCount: 8,
  ticketTtlMs: 24 * 60 * 60 * 1000,
  watchingStaleMs: 10 * 60 * 1000,
  baseBackoffMs: 5000,
  maxBackoffMs: 5 * 60 * 1000,
} as const;

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import {
  AD_STORAGE_KEYS,
  AD_SYNC_POLICY,
  AD_TICKET_SCHEMA_VERSION,
  type AdRewardTicket,
  type RewardTicketReason,
  type RewardTicketResult,
  type RewardTicketStatus,
} from '@/src/features/ads/AdConstants';
import { RemoteLogger } from '@/lib/remoteLogger';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildTicket(params: {
  id?: string;
  status: RewardTicketStatus;
  createdAt?: number;
  earnedAt?: number;
  retryCount?: number;
  nextRetryAt?: number;
  lastError?: string;
}): AdRewardTicket {
  const now = Date.now();
  return {
    schemaVersion: AD_TICKET_SCHEMA_VERSION,
    id: params.id ?? Crypto.randomUUID(),
    status: params.status,
    createdAt: params.createdAt ?? now,
    updatedAt: now,
    earnedAt: params.earnedAt,
    retryCount: params.retryCount ?? 0,
    nextRetryAt: params.nextRetryAt,
    lastError: params.lastError,
    expiresAt: (params.createdAt ?? now) + AD_SYNC_POLICY.ticketTtlMs,
    source: 'rewarded_ad',
  };
}

function parseTicket(raw: string): AdRewardTicket | null {
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const validStatuses: RewardTicketStatus[] = ['watching', 'earned_pending_sync', 'syncing', 'synced', 'aborted', 'dead'];
    const status = parsed.status;

    if (typeof status !== 'string' || !validStatuses.includes(status as RewardTicketStatus)) return null;
    if (typeof parsed.id !== 'string' || !parsed.id) return null;
    if (typeof parsed.createdAt !== 'number' || typeof parsed.updatedAt !== 'number') return null;
    if (typeof parsed.retryCount !== 'number' || typeof parsed.expiresAt !== 'number') return null;

    return {
      schemaVersion: AD_TICKET_SCHEMA_VERSION,
      id: parsed.id,
      status: status as RewardTicketStatus,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
      earnedAt: typeof parsed.earnedAt === 'number' ? parsed.earnedAt : undefined,
      retryCount: parsed.retryCount,
      nextRetryAt: typeof parsed.nextRetryAt === 'number' ? parsed.nextRetryAt : undefined,
      lastError: typeof parsed.lastError === 'string' ? parsed.lastError : undefined,
      expiresAt: parsed.expiresAt,
      source: 'rewarded_ad',
    };
  } catch {
    return null;
  }
}

export const AdTicketManager = {
  async create(params: {
    status: RewardTicketStatus;
    transactionId?: string;
    reason?: RewardTicketReason;
  }): Promise<RewardTicketResult> {
    const existing = await this.getPending();

    if (existing && (existing.status === 'earned_pending_sync' || existing.status === 'syncing') && params.status === 'watching') {
      return { ok: true, ticket: existing };
    }

    const ticket = buildTicket({
      id: params.transactionId ?? existing?.id,
      status: params.status,
      createdAt: existing?.createdAt,
      earnedAt: existing?.earnedAt,
      retryCount: existing?.retryCount ?? 0,
      nextRetryAt: existing?.nextRetryAt,
      lastError: existing?.lastError,
    });

    try {
      await AsyncStorage.setItem(AD_STORAGE_KEYS.pendingReward, JSON.stringify(ticket));
      return { ok: true, ticket };
    } catch (err) {
      const message = toErrorMessage(err);
      RemoteLogger.error('Ads', `❌ Failed to create reward ticket: ${message}`);
      return { ok: false, message };
    }
  },

  async updateStatus(params: {
    status: RewardTicketStatus;
    transactionId: string;
    reason?: RewardTicketReason;
    retryCount?: number;
    nextRetryAt?: number;
    lastError?: string;
  }): Promise<RewardTicketResult> {
    const existing = await this.getPending();

    const ticket = buildTicket({
      id: params.transactionId,
      status: params.status,
      createdAt: existing?.createdAt,
      earnedAt: existing?.earnedAt,
      retryCount: params.retryCount ?? existing?.retryCount ?? 0,
      nextRetryAt: params.nextRetryAt ?? existing?.nextRetryAt,
      lastError: params.lastError ?? existing?.lastError,
    });

    try {
      await AsyncStorage.setItem(AD_STORAGE_KEYS.pendingReward, JSON.stringify(ticket));
      return { ok: true, ticket };
    } catch (err) {
      const message = toErrorMessage(err);
      RemoteLogger.error('Ads', `❌ Failed to update reward ticket status: ${message}`);
      return { ok: false, message };
    }
  },

  async getPending(): Promise<AdRewardTicket | null> {
    try {
      const raw = await AsyncStorage.getItem(AD_STORAGE_KEYS.pendingReward);
      if (!raw) return null;

      const ticket = parseTicket(raw);
      if (ticket) return ticket;

      await this.quarantine(raw, 'invalid_json_or_schema');
      return null;
    } catch (err) {
      RemoteLogger.error('Ads', `❌ Failed to read pending reward ticket: ${toErrorMessage(err)}`);
      return null;
    }
  },

  async clear(transactionId?: string): Promise<void> {
    const existing = await this.getPending();
    if (!existing) return;
    if (transactionId && existing.id !== transactionId) return;
    await AsyncStorage.removeItem(AD_STORAGE_KEYS.pendingReward);
  },

  async quarantine(raw: string, reason: RewardTicketReason): Promise<void> {
    try {
      await AsyncStorage.setItem(
        AD_STORAGE_KEYS.rewardQuarantine,
        JSON.stringify({ reason, raw, quarantinedAt: Date.now() }),
      );
      await AsyncStorage.removeItem(AD_STORAGE_KEYS.pendingReward);
      RemoteLogger.warn('Ads', `🧯 Corrupted reward ticket quarantined (${reason})`);
    } catch (err) {
      RemoteLogger.error('Ads', `❌ Failed to quarantine reward ticket: ${toErrorMessage(err)}`);
    }
  },
};

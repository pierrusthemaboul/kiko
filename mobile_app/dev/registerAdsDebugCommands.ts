import { AdTicketManager } from '@/src/features/ads/AdTicketManager';
import { AD_STORAGE_KEYS } from '@/src/features/ads/AdConstants';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare global {
  var __seedEarnedPendingSyncTicket: (() => Promise<string>) | undefined;
  var __clearRewardTickets: (() => Promise<void>) | undefined;
}

async function seedEarnedPendingSyncTicket(): Promise<string> {
  const created = await AdTicketManager.create({ status: 'earned_pending_sync', reason: 'manual_grant' });
  if (!created.ok) {
    throw new Error(created.message);
  }

  console.log(`[AdsDebug] Seeded earned_pending_sync ticket: ${created.ticket.id}`);
  return created.ticket.id;
}

async function clearRewardTickets(): Promise<void> {
  await AdTicketManager.clear();
  await AsyncStorage.multiRemove([
    AD_STORAGE_KEYS.pendingReward,
    AD_STORAGE_KEYS.rewardQuarantine,
  ]);
  console.log('[AdsDebug] Cleared reward ticket + quarantine');
}

if (__DEV__) {
  globalThis.__seedEarnedPendingSyncTicket = seedEarnedPendingSyncTicket;
  globalThis.__clearRewardTickets = clearRewardTickets;
  console.log('[AdsDebug] Commands registered: __seedEarnedPendingSyncTicket(), __clearRewardTickets()');
}

export {};

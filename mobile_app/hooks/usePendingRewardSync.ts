import { useEffect } from 'react';
import { AppState } from 'react-native';

import { supabase } from '../lib/supabase/supabaseClients';
import { RemoteLogger } from '../lib/remoteLogger';
import { FirebaseAnalytics } from '../lib/firebase';
import { AdTicketManager } from '@/src/features/ads/AdTicketManager';
import { AD_SYNC_POLICY } from '@/src/features/ads/AdConstants';
import { notifyPlaysRefreshRequested } from '@/hooks/usePlays';

export type GrantExtraPlayResult =
  | { ok: true; userType: 'registered' | 'guest' }
  | { ok: false; message: string };

let syncInFlight = false;

function computeBackoffMs(retryCount: number): number {
  const unclamped = AD_SYNC_POLICY.baseBackoffMs * (2 ** Math.max(0, retryCount - 1));
  const capped = Math.min(unclamped, AD_SYNC_POLICY.maxBackoffMs);
  const jitter = Math.floor(capped * (Math.random() * 0.2));
  return capped + jitter;
}

async function syncPendingRewardTicket(trigger: 'startup' | 'foreground' | 'manual'): Promise<boolean> {
  if (syncInFlight) return false;
  syncInFlight = true;

  try {
    const ticket = await AdTicketManager.getPending();
    if (!ticket) return false;

    const now = Date.now();
    const isExpiredByField = ticket.expiresAt <= now;
    const isExpiredByHardTtl = now - ticket.createdAt > AD_SYNC_POLICY.ticketTtlMs;

    if (ticket.status === 'watching') {
      if (now - ticket.createdAt > AD_SYNC_POLICY.watchingStaleMs) {
        await AdTicketManager.updateStatus({
          status: 'aborted',
          transactionId: ticket.id,
          reason: 'watching_ticket_stale',
          lastError: 'watching_ticket_stale',
        });
        await AdTicketManager.clear(ticket.id);
      }
      return false;
    }

    if (isExpiredByField || isExpiredByHardTtl) {
      await AdTicketManager.updateStatus({
        status: 'dead',
        transactionId: ticket.id,
        reason: 'ttl_expired',
        lastError: 'ttl_expired',
      });
      await AdTicketManager.clear(ticket.id);
      return false;
    }

    if (ticket.status !== 'earned_pending_sync' && ticket.status !== 'syncing') {
      return false;
    }

    if (ticket.retryCount >= AD_SYNC_POLICY.maxRetryCount) {
      await AdTicketManager.updateStatus({
        status: 'dead',
        transactionId: ticket.id,
        reason: 'retry_limit_reached',
        lastError: 'retry_limit_reached',
      });
      await AdTicketManager.clear(ticket.id);
      return false;
    }

    if (ticket.nextRetryAt && now < ticket.nextRetryAt) {
      return false;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return false;
    }

    await AdTicketManager.updateStatus({
      status: 'syncing',
      transactionId: ticket.id,
      reason: 'manual_grant',
      retryCount: ticket.retryCount,
      nextRetryAt: ticket.nextRetryAt,
      lastError: ticket.lastError,
    });

    const { error } = await (supabase as any).rpc('grant_extra_play', {
      p_increment: 1,
      p_transaction_id: ticket.id,
    });

    if (!error) {
      await AdTicketManager.clear(ticket.id);
      notifyPlaysRefreshRequested(`reward_sync_${trigger}`);
      FirebaseAnalytics.trackEvent('offline_reward_synced', {
        transaction_id: ticket.id,
        delay_ms: now - ticket.createdAt,
        retry_count: ticket.retryCount,
        trigger,
      });
      return true;
    }

    const retryCount = ticket.retryCount + 1;
    const backoffMs = computeBackoffMs(retryCount);
    await AdTicketManager.updateStatus({
      status: 'earned_pending_sync',
      transactionId: ticket.id,
      reason: 'manual_grant',
      retryCount,
      nextRetryAt: Date.now() + backoffMs,
      lastError: error.message,
    });
    RemoteLogger.error('Ads', `Failed to sync pending reward ticket (id=${ticket.id}, retry=${retryCount}): ${error.message}`);
    return false;
  } catch (e) {
    RemoteLogger.error('Ads', `Pending reward sync failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  } finally {
    syncInFlight = false;
  }
}

export async function grantExtraPlayFromRewardedAd(params: {
  guestGrantExtraPlay: () => Promise<void>;
  refreshPlaysInfo: () => Promise<void>;
}): Promise<GrantExtraPlayResult> {
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      await params.guestGrantExtraPlay();
      await params.refreshPlaysInfo();
      return { ok: true, userType: 'guest' };
    }

    const existingTicket = await AdTicketManager.getPending();
    const created = await AdTicketManager.create({
      status: 'earned_pending_sync',
      transactionId: existingTicket?.id,
      reason: 'manual_grant',
    });

    if (!created.ok) {
      return { ok: false, message: created.message };
    }

    const synced = await syncPendingRewardTicket('manual');
    if (!synced) {
      return { ok: false, message: 'reward_sync_deferred' };
    }

    await params.refreshPlaysInfo();
    return { ok: true, userType: 'registered' };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export function usePendingRewardSync() {
  useEffect(() => {
    const startupTimer = setTimeout(() => {
      void syncPendingRewardTicket('startup');
    }, 2000);

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void syncPendingRewardTicket('startup');
      }
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void syncPendingRewardTicket('startup');
        return;
      }
    });

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void syncPendingRewardTicket('foreground');
      }
    });

    return () => {
      clearTimeout(startupTimer);
      authSubscription.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);
}

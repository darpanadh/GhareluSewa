import { adminAPI, providerAPI } from './api';

const STORE_KEY = 'gharelu_payout_requests';

/**
 * Get all payout requests from localStorage fallback.
 */
export function getAllPayoutRequests() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Fetch all payout requests from server (Async for Admin).
 */
export async function fetchAllPayoutRequestsAsync() {
  try {
    const res = await adminAPI.getPayoutRequests();
    const serverRequests = res.data || [];
    localStorage.setItem(STORE_KEY, JSON.stringify(serverRequests));
    window.dispatchEvent(new CustomEvent('payout_store_updated'));
    return serverRequests;
  } catch (err) {
    console.warn('Could not fetch server payout requests, using local cache', err);
    return getAllPayoutRequests();
  }
}

/**
 * Get payout requests for a specific provider.
 */
export function getProviderPayoutRequests(providerId) {
  return getAllPayoutRequests().filter(r => String(r.provider_id) === String(providerId));
}

/**
 * Fetch provider payout requests from server (Async).
 */
export async function fetchProviderPayoutRequestsAsync(providerId) {
  try {
    const res = await providerAPI.getPayouts();
    const serverRequests = res.data || [];
    
    // Merge with local storage
    const all = getAllPayoutRequests();
    const otherProviders = all.filter(r => String(r.provider_id) !== String(providerId));
    const merged = [...serverRequests, ...otherProviders];
    localStorage.setItem(STORE_KEY, JSON.stringify(merged));
    
    window.dispatchEvent(new CustomEvent('payout_store_updated'));
    return serverRequests;
  } catch (err) {
    console.warn('Could not fetch provider payouts from server', err);
    return getProviderPayoutRequests(providerId);
  }
}

/**
 * Submit a new payout request (called by provider).
 */
export async function submitPayoutRequest(request) {
  const localReq = {
    id: `PW-${Date.now().toString(36).toUpperCase()}`,
    provider_id: request.provider_id,
    provider_name: request.provider_name || 'Unknown Provider',
    provider_email: request.provider_email || '',
    category: request.category || 'General',
    amount: Number(request.amount),
    method: request.method || 'eSewa',
    account_details: request.account_details || '',
    status: 'pending',
    requested_at: new Date().toISOString(),
    processed_at: null,
  };

  try {
    const res = await providerAPI.requestPayout({
      amount: Number(request.amount),
      method: request.method,
      account_details: request.account_details,
      provider_name: request.provider_name,
      provider_email: request.provider_email,
      category: request.category,
    });
    const created = res.data || localReq;
    
    const all = getAllPayoutRequests();
    all.unshift(created);
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('payout_store_updated'));
    return created;
  } catch (err) {
    console.warn('Failed to submit payout to backend, saving locally', err);
    const all = getAllPayoutRequests();
    all.unshift(localReq);
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('payout_store_updated'));
    return localReq;
  }
}

/**
 * Admin: Mark a payout request as completed.
 */
export async function markPayoutCompleted(requestId) {
  try {
    await adminAPI.updatePayoutStatus(requestId, 'completed');
  } catch (err) {
    console.warn('Server status update failed, updating local state', err);
  }

  const all = getAllPayoutRequests();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    all[idx].status = 'completed';
    all[idx].processed_at = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('payout_store_updated'));
    return all[idx];
  }
  return null;
}

/**
 * Admin: Reject a payout request.
 */
export async function markPayoutRejected(requestId) {
  try {
    await adminAPI.updatePayoutStatus(requestId, 'rejected');
  } catch (err) {
    console.warn('Server status update failed, updating local state', err);
  }

  const all = getAllPayoutRequests();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx !== -1) {
    all[idx].status = 'rejected';
    all[idx].processed_at = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('payout_store_updated'));
    return all[idx];
  }
  return null;
}

/**
 * Compute aggregate stats.
 */
export function getPayoutStats() {
  const all = getAllPayoutRequests();
  const pending = all.filter(r => r.status === 'pending');
  const completed = all.filter(r => r.status === 'completed');

  return {
    totalRequested: all.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    totalDisbursed: completed.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    totalPending: pending.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    pendingCount: pending.length,
    completedCount: completed.length,
    totalCount: all.length,
  };
}

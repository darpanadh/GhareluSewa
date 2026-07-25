/**
 * Shared Payout Store — localStorage-based sync between Provider ↔ Admin
 * 
 * When a provider submits a withdrawal request, it's saved here.
 * The admin ManagePayments page reads from here and can disburse payments.
 * When admin marks a request as 'completed', the provider sees the update.
 */

const STORE_KEY = 'gharelu_payout_requests';

/**
 * Get all payout requests from the store.
 * @returns {Array} Array of payout request objects
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
 * Get payout requests for a specific provider.
 * @param {number|string} providerId 
 * @returns {Array}
 */
export function getProviderPayoutRequests(providerId) {
  return getAllPayoutRequests().filter(r => String(r.provider_id) === String(providerId));
}

/**
 * Submit a new payout request (called by provider).
 * @param {Object} request — { provider_id, provider_name, provider_email, category, amount, method, account_details }
 * @returns {Object} The created request with id, status, timestamps
 */
export function submitPayoutRequest(request) {
  const all = getAllPayoutRequests();
  
  const newRequest = {
    id: `PW-${Date.now().toString(36).toUpperCase()}`,
    provider_id: request.provider_id,
    provider_name: request.provider_name || 'Unknown Provider',
    provider_email: request.provider_email || '',
    category: request.category || 'General',
    amount: Number(request.amount),
    method: request.method || 'eSewa',
    account_details: request.account_details || '',
    status: 'pending',             // 'pending' | 'completed' | 'rejected'
    requested_at: new Date().toISOString(),
    processed_at: null,
  };
  
  all.unshift(newRequest);
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
  
  // Dispatch a custom event so other open tabs/components can react
  window.dispatchEvent(new CustomEvent('payout_store_updated'));
  
  return newRequest;
}

/**
 * Admin: Mark a payout request as completed (payment sent).
 * @param {string} requestId 
 * @returns {Object|null} The updated request, or null if not found
 */
export function markPayoutCompleted(requestId) {
  const all = getAllPayoutRequests();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx === -1) return null;
  
  all[idx].status = 'completed';
  all[idx].processed_at = new Date().toISOString();
  
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('payout_store_updated'));
  
  return all[idx];
}

/**
 * Admin: Reject a payout request.
 * @param {string} requestId 
 * @returns {Object|null}
 */
export function markPayoutRejected(requestId) {
  const all = getAllPayoutRequests();
  const idx = all.findIndex(r => r.id === requestId);
  if (idx === -1) return null;
  
  all[idx].status = 'rejected';
  all[idx].processed_at = new Date().toISOString();
  
  localStorage.setItem(STORE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent('payout_store_updated'));
  
  return all[idx];
}

/**
 * Compute aggregate stats from all requests.
 * @returns {Object} { totalRequested, totalDisbursed, totalPending, pendingCount, completedCount }
 */
export function getPayoutStats() {
  const all = getAllPayoutRequests();
  const pending = all.filter(r => r.status === 'pending');
  const completed = all.filter(r => r.status === 'completed');
  
  return {
    totalRequested: all.reduce((s, r) => s + r.amount, 0),
    totalDisbursed: completed.reduce((s, r) => s + r.amount, 0),
    totalPending: pending.reduce((s, r) => s + r.amount, 0),
    pendingCount: pending.length,
    completedCount: completed.length,
    totalCount: all.length,
  };
}

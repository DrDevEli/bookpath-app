import api from './api';

// Access token key (short-lived, ~15 min). The REFRESH token no longer lives
// here — it is in an httpOnly, Secure, SameSite=Strict cookie set by the
// backend (M3), so XSS can't exfiltrate the long-lived credential.
const TOKEN_KEY = 'auth_token';
// Lightweight marker so boot-time session restore only fires for users who
// logged in before (avoids a pointless /refresh 401 for anonymous visitors).
const SESSION_MARKER_KEY = 'bp_session';

let bootRestoreAttempted = false;

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken } = response.data;

    if (!accessToken) {
      return false;
    }

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(SESSION_MARKER_KEY, '1');
    return true;
  } catch {
    return false;
  }
};

export const register = async (name: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
};

/**
 * Silently renew the access token using the httpOnly refresh cookie.
 * Returns true on success. No-op when no refresh cookie exists.
 */
export const refreshSession = async (): Promise<boolean> => {
  try {
    // Cookie is sent automatically (same-origin /api). Never send the token
    // from JS — there is none to send, which is the point.
    const response = await api.post('/auth/refresh', {}, { skipAuthRedirect: true } as any);
    const { accessToken } = response.data;
    if (!accessToken) return false;
    localStorage.setItem(TOKEN_KEY, accessToken);
    return true;
  } catch {
    return false;
  }
};

/**
 * Boot-time session restore: if the access token is gone/expired but the user
 * has a refresh cookie (marker present), try one silent refresh and reload so
 * the SPA renders in the authenticated state.
 */
export const restoreSessionIfNeeded = async (): Promise<void> => {
  if (bootRestoreAttempted) return;
  bootRestoreAttempted = true;

  const token = localStorage.getItem(TOKEN_KEY);
  if (token || localStorage.getItem(SESSION_MARKER_KEY) !== '1') return;

  const ok = await refreshSession();
  if (ok) {
    // Refresh landed a fresh access token — reload once so Header/routes
    // evaluate isAuthenticated() correctly.
    window.location.reload();
  }
};

export const logout = async () => {
  try {
    // Tell the server to clear the httpOnly refresh cookie + blacklist the jti
    // (works even if the access token already expired).
    await api.post('/auth/logout', {}, { skipAuthRedirect: true } as any);
  } catch {
    // Local cleanup must happen regardless of network state.
  } finally {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_MARKER_KEY);
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getUserRole = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
};

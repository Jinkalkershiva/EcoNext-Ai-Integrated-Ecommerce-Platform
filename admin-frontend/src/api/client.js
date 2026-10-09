/**
 * Centralized API client for EcoNext Admin & Staff Operational Management System.
 * Supports token lifecycle, refresh token rotation, concurrent refresh deduplication,
 * and distinct 401/403 authorization handling.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api';

const TOKEN_KEY = 'econext_staff_access_token';
const REFRESH_KEY = 'econext_staff_refresh_token';
const USER_KEY = 'econext_staff_user';

export const authStore = {
  getToken: () => {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const clean = raw.replace(/^Bearer\s+/i, '').trim();
    return clean || null;
  },

  getRefreshToken: () => {
    const raw = localStorage.getItem(REFRESH_KEY);
    if (!raw) return null;
    const clean = raw.replace(/^Bearer\s+/i, '').trim();
    return clean || null;
  },

  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setAuth: (data) => {
    if (!data) return;
    const access = data.accessToken || data.access || data.token;
    const refresh = data.refreshToken || data.refresh;

    if (access && typeof access === 'string') {
      localStorage.setItem(TOKEN_KEY, access.replace(/^Bearer\s+/i, '').trim());
    }
    if (refresh && typeof refresh === 'string') {
      localStorage.setItem(REFRESH_KEY, refresh.replace(/^Bearer\s+/i, '').trim());
    }

    // Preserve user object; only update USER_KEY if user metadata fields are present
    if (data.username || data.email || data.id || data.role || data.roles) {
      const existing = authStore.getUser() || {};
      const merged = { ...existing, ...data };
      localStorage.setItem(USER_KEY, JSON.stringify(merged));
    }
  },

  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

// Singleton promise to deduplicate concurrent refresh requests
let inFlightRefreshPromise = null;

async function tryRefreshToken() {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  inFlightRefreshPromise = (async () => {
    const refresh = authStore.getRefreshToken();
    if (!refresh) return false;

    const payload = JSON.stringify({ refreshToken: refresh, refresh });
    const endpoints = [
      `${API_BASE}/admin/auth/refresh/`,
      `${API_BASE}/admin/auth/refresh`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        });

        if (res.ok) {
          const body = await res.json().catch(() => null);
          const data = body?.data || body;
          const newAccess = data?.accessToken || data?.access;
          if (newAccess) {
            authStore.setAuth(data);
            return true;
          }
        }
      } catch {
        // Continue to fallback endpoint
      }
    }

    return false;
  })().finally(() => {
    inFlightRefreshPromise = null;
  });

  return inFlightRefreshPromise;
}

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, auth = true, isFormData = false, _isRetry = false } = options;
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = authStore.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined)
  };

  const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  let response;
  try {
    response = await fetch(fullUrl, config);
  } catch (err) {
    throw new Error(endpoint.includes('/auth')
      ? 'Unable to connect to the authentication service. Please verify backend services are active.'
      : 'Unable to connect to backend services. Please verify backend services are active.');
  }

  // 1. Handle 401 Unauthorized with token refresh (at most once per request)
  if (response.status === 401 && auth) {
    if (!_isRetry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the request once with new token
        return apiRequest(endpoint, { ...options, _isRetry: true });
      }
    }

    // Refresh failed or already retried once
    authStore.clear();
    window.dispatchEvent(new CustomEvent('econext:admin-auth-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => null);

  // 2. Handle non-OK HTTP responses
  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred.';

    if (response.status === 403) {
      // Permission Denied - DO NOT clear user session
      errorMsg = data?.message || 'Access denied: You do not have permission to perform this action.';
    } else if (response.status === 401) {
      if (data?.message && data.message !== 'Invalid credentials' && !data.message.includes('Bad credentials')) {
        errorMsg = data.message;
      } else {
        errorMsg = 'Invalid username or password.';
      }
    } else if (data?.message) {
      errorMsg = data.message;
    } else if (typeof data?.error === 'string') {
      errorMsg = data.error;
    } else if (response.status >= 500) {
      errorMsg = endpoint.includes('/auth')
        ? 'Authentication service is temporarily unavailable.'
        : 'Internal server error occurred. Please try again later.';
    } else {
      errorMsg = `Request failed with status ${response.status}`;
    }

    throw new Error(errorMsg);
  }

  return data;
}

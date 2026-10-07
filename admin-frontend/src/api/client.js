/**
 * Centralized API client for EcoNext Admin & Staff Operational Management System.
 * Communicates with the Java Spring Cloud API Gateway (port 8080) and microservices.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080/api';

const TOKEN_KEY = 'econext_staff_access_token';
const REFRESH_KEY = 'econext_staff_refresh_token';
const USER_KEY = 'econext_staff_user';

export const authStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setAuth: (data) => {
    if (data?.accessToken) localStorage.setItem(TOKEN_KEY, data.accessToken);
    if (data?.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
    if (data) localStorage.setItem(USER_KEY, JSON.stringify(data));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, auth = true, isFormData = false } = options;
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

  if (response.status === 401 && auth) {
    // Attempt token refresh for expired session
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${authStore.getToken()}`;
      response = await fetch(fullUrl, { ...config, headers });
    } else {
      authStore.clear();
      window.dispatchEvent(new CustomEvent('econext:admin-auth-expired'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMsg = 'An unexpected error occurred.';
    if (response.status === 401) {
      if (data?.message && data.message !== 'Invalid credentials' && !data.message.includes('Bad credentials')) {
        errorMsg = data.message;
      } else {
        errorMsg = 'Invalid username or password.';
      }
    } else if (response.status === 403) {
      errorMsg = data?.message || 'Your account does not have authorization to access this portal.';
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

async function tryRefreshToken() {
  const refresh = authStore.getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.accessToken) {
        authStore.setAuth(data.data);
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Centralized API client for the EcoNext backend.
 *
 * Design notes (these were real bugs before):
 *
 *  1. The old `handleResponse` only threw on status >= 500, so every 4xx was
 *     parsed as if it had succeeded. A failed login resolved happily with an
 *     error body and the UI treated it as a win. Now *any* non-ok response
 *     raises an `ApiError` carrying the status, the parsed body and any
 *     per-field validation errors.
 *
 *  2. Tokens were read in two different ways — some methods reached into
 *     localStorage themselves, others took an `authToken` argument from the
 *     caller — so the two could disagree. `tokenStore` is now the single
 *     source of truth. The old `authToken` parameters are still accepted so
 *     existing call sites keep working, but they are ignored.
 *
 *  3. Nothing handled an expired access token. A 401 on an authenticated
 *     request now transparently spends the refresh token once and retries. If
 *     the refresh also fails, credentials are cleared and an
 *     `econext:auth-expired` event is dispatched so the app can show the login
 *     screen instead of silently rendering empty data.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';

const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
// 'user' rather than 'authUser' so that sessions already in localStorage from
// the previous build keep working after this change.
const USER_KEY = 'user';

/** Dispatched when the session is gone for good and the user must log in again. */
export const AUTH_EXPIRED_EVENT = 'econext:auth-expired';

/** An HTTP-level failure. `fieldErrors` maps form field name -> message. */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, fieldErrors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.fieldErrors = fieldErrors;
    /** True for network failures / server down, as opposed to a real HTTP status. */
    this.isNetworkError = status === 0;
  }
}

/* ------------------------------------------------------------------ *
 * Token storage
 * ------------------------------------------------------------------ */

// localStorage throws in private-browsing modes and when storage is full, so
// every access is guarded. Losing persistence is survivable; crashing is not.
const safeStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore — the session still works, it just won't survive a reload */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const tokenStore = {
  getAccess() {
    return safeStorage.get(ACCESS_TOKEN_KEY);
  },

  getRefresh() {
    return safeStorage.get(REFRESH_TOKEN_KEY);
  },

  /** Accepts the backend's `{ access, refresh }` token object. */
  set(tokens) {
    if (!tokens) return;
    if (tokens.access) safeStorage.set(ACCESS_TOKEN_KEY, tokens.access);
    if (tokens.refresh) safeStorage.set(REFRESH_TOKEN_KEY, tokens.refresh);
  },

  getUser() {
    const raw = safeStorage.get(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt entry — drop it rather than letting it break every render.
      safeStorage.remove(USER_KEY);
      return null;
    }
  },

  setUser(user) {
    if (user) safeStorage.set(USER_KEY, JSON.stringify(user));
    else safeStorage.remove(USER_KEY);
  },

  clear() {
    safeStorage.remove(ACCESS_TOKEN_KEY);
    safeStorage.remove(REFRESH_TOKEN_KEY);
    safeStorage.remove(USER_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getAccess());
  },
};

function notifyAuthExpired() {
  tokenStore.clear();
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

/* ------------------------------------------------------------------ *
 * Response handling
 * ------------------------------------------------------------------ */

async function parseBody(response) {
  // 204, and any empty body, must not go through response.json().
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Turn a DRF error body into one human-readable sentence plus a field map.
 * DRF hands back several shapes: {message}, {detail}, {errors: {field: [...]}},
 * or a bare {field: [...]}.
 */
function describeError(body, status) {
  const fallback = status
    ? `Request failed (${status})`
    : 'Could not reach the server.';
  if (!body) return { message: fallback, fieldErrors: null };
  if (typeof body === 'string') return { message: body, fieldErrors: null };

  const fieldSource =
    body.errors && typeof body.errors === 'object' ? body.errors : null;

  let fieldErrors = null;
  if (fieldSource) {
    fieldErrors = {};
    Object.entries(fieldSource).forEach(([key, value]) => {
      fieldErrors[key] = Array.isArray(value) ? value.join(' ') : String(value);
    });
  }

  // A bare validation body: every value is a list of strings.
  if (!fieldErrors && !body.message && !body.detail) {
    const entries = Object.entries(body).filter(
      ([, value]) => Array.isArray(value) || typeof value === 'string'
    );
    if (entries.length) {
      fieldErrors = {};
      entries.forEach(([key, value]) => {
        fieldErrors[key] = Array.isArray(value) ? value.join(' ') : String(value);
      });
    }
  }

  const message =
    body.message ||
    body.detail ||
    (fieldErrors && Object.values(fieldErrors)[0]) ||
    fallback;

  return { message, fieldErrors };
}

/**
 * Perform one HTTP request.
 *
 * @param {string} path      Path below the API root, e.g. '/products/'.
 * @param {object} options
 * @param {boolean} options.auth       Attach the bearer token.
 * @param {object|FormData} options.body
 * @param {boolean} options._retried   Internal: prevents refresh loops.
 */
async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = false,
    headers = {},
    _retried = false,
  } = options;

  const requestHeaders = { Accept: 'application/json', ...headers };
  let payload;

  if (body instanceof FormData) {
    // Let the browser set the multipart boundary; setting Content-Type breaks it.
    payload = body;
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = tokenStore.getAccess();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: payload,
    });
  } catch (cause) {
    // fetch only rejects on network-level problems (server down, CORS, DNS).
    throw new ApiError(
      'Could not reach the EcoNext server. Check that the backend is running.',
      { status: 0, data: null }
    );
  }

  if (response.ok) {
    return parseBody(response);
  }

  const errorBody = await parseBody(response);

  // Expired access token: spend the refresh token once, then retry.
  if (response.status === 401 && auth && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(path, { ...options, _retried: true });
    }
    notifyAuthExpired();
    throw new ApiError('Your session has expired. Please log in again.', {
      status: 401,
      data: errorBody,
    });
  }

  const { message, fieldErrors } = describeError(errorBody, response.status);
  throw new ApiError(message, {
    status: response.status,
    data: errorBody,
    fieldErrors,
  });
}

// Concurrent 401s must not each fire their own refresh, or all but one of the
// resulting rotated tokens would be discarded. They share one in-flight promise.
let refreshInFlight = null;

function tryRefresh() {
  if (refreshInFlight) return refreshInFlight;

  const refresh = tokenStore.getRefresh();
  if (!refresh) return Promise.resolve(false);

  refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh }),
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = await parseBody(response);
      if (!data?.access) return false;
      // ROTATE_REFRESH_TOKENS may hand back a new refresh token too.
      tokenStore.set({ access: data.access, refresh: data.refresh });
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

/* ------------------------------------------------------------------ *
 * Shape helpers
 * ------------------------------------------------------------------ */

/**
 * Pull an array out of whatever the endpoint returned. The backend is not
 * uniform: DRF viewsets return bare arrays or {results}, while the hand-written
 * views return {products} or {recommendations}.
 */
export const normalizeListResponse = (response) => {
  if (Array.isArray(response)) return response;
  if (!response || typeof response !== 'object') return [];
  for (const key of ['results', 'data', 'products', 'recommendations', 'orders', 'items']) {
    if (Array.isArray(response[key])) return response[key];
  }
  return [];
};

const buildQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

export const apiService = {
  // ---------- Authentication ----------

  /** Register, then store the returned tokens so the user is logged straight in. */
  async signup(userData) {
    const data = await request('/auth/signup/', { method: 'POST', body: userData });
    tokenStore.set(data?.tokens);
    if (data?.user) tokenStore.setUser(data.user);
    return data;
  },

  async login(credentials) {
    const data = await request('/auth/login/', { method: 'POST', body: credentials });
    tokenStore.set(data?.tokens);
    if (data?.user) tokenStore.setUser(data.user);
    return data;
  },

  /**
   * Log out. The refresh token is sent so the backend can blacklist it —
   * without it the access token would stay valid until it expired on its own.
   * Local credentials are cleared even if the network call fails.
   */
  async logout() {
    const refresh = tokenStore.getRefresh();
    try {
      await request('/auth/logout/', {
        method: 'POST',
        auth: true,
        body: refresh ? { refresh } : {},
      });
    } catch {
      // Already-expired tokens make this fail, which is not worth surfacing.
    } finally {
      tokenStore.clear();
    }
    return { status: 'success' };
  },

  getCurrentUser() {
    return request('/auth/current-user/', { auth: true });
  },

  updateProfile(profileData) {
    return request('/auth/profile/update/', {
      method: 'PATCH',
      auth: true,
      body: profileData,
    });
  },

  // ---------- Products ----------

  /**
   * Products, paginated. Accepts either a filter object or the legacy
   * (page, perPage) positional form.
   */
  getProducts(arg1 = 1, arg2 = 12) {
    const params =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { page: arg1, per_page: arg2 };
    return request(`/products/${buildQuery(params)}`);
  },

  getProductDetail(productId) {
    return request(`/products/${productId}/`);
  },

  // ---------- Taxonomy / personalization ----------

  getAgeGroups() {
    return request('/products/age-groups/').then(normalizeListResponse);
  },

  getGenderCategories() {
    return request('/products/gender-categories/').then(normalizeListResponse);
  },

  /**
   * Categories. The endpoint returns {categories: [...]}, which the previous
   * implementation mishandled — it only accepted an object-of-objects and so
   * returned [] every single time, leaving the category nav permanently empty.
   */
  async getCategories() {
    const response = await request('/products/categories/');
    if (Array.isArray(response)) return response;
    const categories = response?.categories;
    if (Array.isArray(categories)) return categories;
    // Legacy shape: {categories: {name: [...]}}.
    if (categories && typeof categories === 'object') {
      return Object.keys(categories).map((name, idx) => ({ id: idx + 1, name }));
    }
    return [];
  },

  /** Products within one category. */
  getCategoryProducts(categoryId) {
    return request(`/products/categories/${buildQuery({ id: categoryId })}`);
  },

  getEcoTags() {
    return request('/products/eco-tags/').then(normalizeListResponse);
  },

  getRecommendations() {
    return request('/products/recommendations/', { auth: true });
  },

  getUserPreferences() {
    return request('/personalization/preferences/', { auth: true }).then(
      normalizeListResponse
    );
  },

  /** Create the preference row on first save, patch it afterwards. */
  async updateUserPreferences(preferences) {
    const existing = await this.getUserPreferences();
    if (existing.length > 0) {
      return request(`/personalization/preferences/${existing[0].id}/`, {
        method: 'PATCH',
        auth: true,
        body: preferences,
      });
    }
    return request('/personalization/preferences/', {
      method: 'POST',
      auth: true,
      body: preferences,
    });
  },

  // ---------- Search ----------

  intentSearch(query) {
    return request(`/products/search/intent/${buildQuery({ q: query })}`);
  },

  visualSearch(imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    return request('/products/search/visual/', { method: 'POST', body: formData });
  },

  // ---------- ML ----------

  getPricePrediction(productId) {
    return request(`/products/${productId}/prediction/`);
  },

  getTrendingProducts() {
    return request('/products/trending/');
  },

  /** Most-run search queries from the last 7 days. Routed at search/trending/. */
  getSearchHistory() {
    return request('/products/search/trending/');
  },

  // ---------- Cart ----------
  // The trailing authToken arguments are vestigial: the token now comes from
  // tokenStore. They are kept so older call sites still compile.

  getCart() {
    return request('/cart/', { auth: true });
  },

  addToCart(productId, quantity = 1) {
    return request('/cart/add/', {
      method: 'POST',
      auth: true,
      body: { product_id: productId, quantity },
    });
  },

  updateCartItem(itemId, quantity) {
    return request(`/cart/item/${itemId}/`, {
      method: 'PATCH',
      auth: true,
      body: { quantity },
    });
  },

  removeFromCart(itemId) {
    return request(`/cart/item/${itemId}/delete/`, { method: 'DELETE', auth: true });
  },

  clearCart() {
    return request('/cart/clear/', { method: 'DELETE', auth: true });
  },

  // ---------- Orders ----------

  createOrder(shippingData) {
    return request('/orders/create/', {
      method: 'POST',
      auth: true,
      body: { shipping: shippingData },
    });
  },

  getOrders() {
    return request('/orders/', { auth: true });
  },

  getOrderDetail(orderId) {
    return request(`/orders/${orderId}/`, { auth: true });
  },

  // ---------- Copilot ----------

  ecoAiRecommend(query) {
    return request('/copilot/', { method: 'POST', body: { query } });
  },

  copilotRecommend(query) {
    return this.ecoAiRecommend(query);
  },

  sendChatMessage(message, history = []) {
    return request('/chat/', { method: 'POST', body: { message, history } });
  },
};

export default apiService;

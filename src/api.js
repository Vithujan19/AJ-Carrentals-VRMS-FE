export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api')
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/, '/api');

let csrfToken = null;
let csrfRequest = null;

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message ?? 'The request could not be completed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.error?.code ?? 'REQUEST_FAILED';
    this.fields = payload?.error?.fields ?? [];
  }
}

export function setCsrfToken(token) {
  csrfToken = token;
}

export function apiResourceUrl(path) {
  const apiPath = path.startsWith('/api/') ? path.slice(4) : path;
  return `${API_BASE_URL}${apiPath}`;
}

export async function getCsrfToken() {
  if (csrfToken) {
    return csrfToken;
  }
  if (!csrfRequest) {
    csrfRequest = apiRequest('/auth/csrf', { method: 'GET', suppressAuthExpiry: true })
      .then(({ data }) => {
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }
  return csrfRequest;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/auth/csrf') {
    headers.set('X-CSRF-Token', await getCsrfToken());
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, {
      error: { code: 'NETWORK_ERROR', message: 'The server could not be reached.' },
    });
  }

  if (response.status === 401 && !options.suppressAuthExpiry) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  if (response.status === 204) {
    return null;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload;
}

export async function apiUpload(path, formData, options = {}) {
  const method = (options.method ?? 'POST').toUpperCase();
  const headers = new Headers(options.headers);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/auth/csrf') {
    headers.set('X-CSRF-Token', await getCsrfToken());
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new ApiError(0, {
      error: { code: 'NETWORK_ERROR', message: 'The server could not be reached.' },
    });
  }

  if (response.status === 401 && !options.suppressAuthExpiry) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload;
}

export async function apiDownload(path) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
  } catch {
    throw new ApiError(0, {
      error: { code: 'NETWORK_ERROR', message: 'The server could not be reached.' },
    });
  }
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, payload);
  }
  return response.blob();
}

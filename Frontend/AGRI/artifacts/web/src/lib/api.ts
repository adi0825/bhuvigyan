const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const API = `${BASE}/api`;

let _refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("bhuvigyan_refresh");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { success: boolean; data?: { accessToken: string; refreshToken: string } };
    if (!json.success || !json.data) return null;
    localStorage.setItem("bhuvigyan_token", json.data.accessToken);
    localStorage.setItem("bhuvigyan_refresh", json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem("bhuvigyan_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  // Check if response is JSON before parsing
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await res.text();
    console.error(`API fetch error: Non-JSON response from ${API}${path}`, {
      status: res.status,
      contentType,
      responseText: text.substring(0, 200),
    });
    throw new Error(`API returned non-JSON response (${res.status}). Check if backend is running.`);
  }

  if (res.status === 401) {
    // Attempt silent token refresh — collapse concurrent refreshes into one
    if (!_refreshPromise) {
      _refreshPromise = attemptTokenRefresh().finally(() => { _refreshPromise = null; });
    }
    const newToken = await _refreshPromise;

    if (newToken) {
      // Retry original request with new token
      const retryHeaders = { ...headers, "Authorization": `Bearer ${newToken}` };
      const retryRes = await fetch(`${API}${path}`, { ...options, headers: retryHeaders });
      const retryContentType = retryRes.headers.get("content-type");
      if (!retryContentType?.includes("application/json")) {
        throw new Error(`API retry returned non-JSON response (${retryRes.status})`);
      }
      const retryJson = await retryRes.json();
      if (!retryRes.ok) throw new Error(retryJson?.error?.message ?? `HTTP ${retryRes.status}`);
      return retryJson;
    }

    // Refresh failed — clear tokens and redirect to login
    clearTokens();
    const role = localStorage.getItem("bhuvigyan_role") ?? "";
    const loginPath = role === "FARMER" ? "/farmer/login"
      : role === "CSC_OPERATOR" ? "/csc/login"
      : role === "FIELD_INSPECTOR" ? "/inspector/login"
      : role === "INSURER" ? "/insurer/login"
      : "/admin/login";
    window.location.href = `${BASE}${loginPath}`;
    throw new Error("Session expired. Redirecting to login.");
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  }
  return json;
}

export function setToken(token: string, key = "bhuvigyan_token") {
  localStorage.setItem(key, token);
}
export function getToken(key = "bhuvigyan_token") {
  return localStorage.getItem(key);
}
export function clearTokens() {
  localStorage.removeItem("bhuvigyan_token");
  localStorage.removeItem("bhuvigyan_refresh");
  localStorage.removeItem("bhuvigyan_role");
  localStorage.removeItem("bhuvigyan_user");
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = localStorage.getItem("bhuvigyan_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await res.text();
    throw new Error(`API returned non-JSON response (${res.status}). ${text.substring(0, 100)}`);
  }

  if (res.status === 401) {
    clearTokens();
    window.location.href = `${BASE}/admin/login`;
    throw new Error("Session expired");
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
  }
  return json;
}

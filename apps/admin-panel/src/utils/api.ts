const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/v1';

export interface UserInfo {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PREMIUM';
}

export const apiClient = {
  getToken: () => localStorage.getItem('admin_token'),
  getRefreshToken: () => localStorage.getItem('admin_refresh_token'),
  getUser: (): UserInfo | null => {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setAuth: (token: string, refreshToken: string, user: UserInfo) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_refresh_token', refreshToken);
    localStorage.setItem('admin_user', JSON.stringify(user));
  },

  clearAuth: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
  },

  request: async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = apiClient.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && endpoint !== '/auth/login') {
      const refreshed = await apiClient.refresh();
      if (refreshed) {
        return apiClient.request(endpoint, options);
      } else {
        apiClient.clearAuth();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro na requisição: ${res.status}`);
    }

    return res.json();
  },

  refresh: async (): Promise<boolean> => {
    const refreshToken = apiClient.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem('admin_token', data.token);
      return true;
    } catch {
      return false;
    }
  },
};

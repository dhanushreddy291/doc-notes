import { authClient } from './neon';

const API_URL = import.meta.env.VITE_NEON_FUNCTION_API_BASE_URL;

export const api = {
  request: async (endpoint: string, options: RequestInit = {}) => {
    const { data } = await authClient.getSession();
    const token = data?.session?.token;

    if (!token) {
      throw new Error('No active session');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },

  getDocuments: () => api.request('/documents'),

  uploadDocument: (formData: FormData) =>
    api.request('/documents', {
      method: 'POST',
      body: formData,
    }),

  toggleStar: (id: string) =>
    api.request(`/documents/${id}`, { method: 'PATCH' }),
};
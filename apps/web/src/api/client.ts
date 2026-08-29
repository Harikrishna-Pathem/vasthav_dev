import axios from 'axios';

export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL, timeout: 15_000 });
apiClient.interceptors.response.use((response) => response, (error) => Promise.reject(new Error(error.response?.data?.error?.message ?? 'Request failed')));

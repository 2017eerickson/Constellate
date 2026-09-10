import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT access token to every request
apiClient.interceptors.request.use(async (config) => {
  const accessToken = await AsyncStorage.getItem('access_token');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: on 401, try refreshing the token and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request
    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;

      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint directly (not through this interceptor)
        const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        // Store the new tokens
        await AsyncStorage.setItem('access_token', data.access);
        if (data.refresh) {
          await AsyncStorage.setItem('refresh_token', data.refresh);
        }

        // Retry the original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear tokens (user needs to sign in again)
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

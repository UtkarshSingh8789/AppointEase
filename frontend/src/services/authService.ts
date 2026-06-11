import api from './api';
import type { LoginCredentials, RegisterData, TokenResponse, User } from '@/types';

/** Authentication service for login, register, and profile management */
export const authService = {
  /** Login with email and password */
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/login', credentials);
    return response.data;
  },

  /** Register a new user */
  async register(data: RegisterData): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/register', data);
    return response.data;
  },

  /** Refresh the access token */
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const response = await api.post<{ access_token: string }>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /** Get current user profile */
  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  /** Update current user profile */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put<User>('/auth/me', data);
    return response.data;
  },
};

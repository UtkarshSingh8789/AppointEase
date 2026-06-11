import api from './api';
import type {
  Provider,
  ProviderListResponse,
  ProviderRegisterPayload,
  ProviderUpdatePayload,
  ProviderStats,
} from '@/types';

/** Provider service for managing provider profiles and listings */
export const providerService = {
  /** Get paginated list of providers with optional filters */
  async getProviders(params?: {
    search?: string;
    category_id?: string;
    location?: string;
    min_rating?: number;
    page?: number;
    size?: number;
  }): Promise<ProviderListResponse> {
    const { size, ...rest } = params || {};
    const response = await api.get<ProviderListResponse>('/providers', {
      params: { ...rest, per_page: size },
    });
    return response.data;
  },

  /** Get a single provider by ID */
  async getProvider(id: string): Promise<Provider> {
    const response = await api.get<Provider>(`/providers/${id}`);
    return response.data;
  },

  /** Get the current user's provider profile */
  async getMyProfile(): Promise<Provider> {
    const response = await api.get<Provider>('/providers/me');
    return response.data;
  },

  /** Register as a provider */
  async register(data: ProviderRegisterPayload): Promise<Provider> {
    const response = await api.post<Provider>('/providers/register', data);
    return response.data;
  },

  /** Register as a provider with files */
  async registerApplication(formData: FormData): Promise<Provider> {
    const response = await api.post<Provider>('/providers/register-application', formData);
    return response.data;
  },

  /** Update provider profile */
  async updateProfile(data: ProviderUpdatePayload): Promise<Provider> {
    const response = await api.put<Provider>('/providers/me', data);
    return response.data;
  },

  /** Get provider statistics */
  async getStats(): Promise<ProviderStats> {
    const response = await api.get<ProviderStats>('/providers/me/stats');
    return response.data;
  },
};

import api from './api';
import type { Provider } from '@/types';

interface FavoriteItem {
  id: string;
  customer_id: string;
  provider_id: string;
  created_at: string;
  provider: Provider | null;
}

interface FavoriteListResponse {
  favorites: FavoriteItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Favorite service for managing provider favorites */
export const favoriteService = {
  /** Add a provider to favorites */
  async addFavorite(providerId: string): Promise<void> {
    await api.post(`/favorites/${providerId}`);
  },

  /** Remove a provider from favorites */
  async removeFavorite(providerId: string): Promise<void> {
    await api.delete(`/favorites/${providerId}`);
  },

  /** Get list of favorited providers */
  async getFavorites(): Promise<Provider[]> {
    const response = await api.get<FavoriteListResponse>('/favorites');
    // Extract provider objects from favorites
    return response.data.favorites
      .map((fav) => fav.provider)
      .filter((p): p is Provider => p !== null);
  },
};

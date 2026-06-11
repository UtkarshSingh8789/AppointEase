import { create } from 'zustand';
import type { Provider } from '@/types';
import { providerService } from '@/services/providerService';
import toast from 'react-hot-toast';

interface ProviderFilters {
  search: string;
  category_id: string;
  location: string;
}

interface ProviderState {
  providers: Provider[];
  selectedProvider: Provider | null;
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  filters: ProviderFilters;
  setFilters: (filters: Partial<ProviderFilters>) => void;
  resetFilters: () => void;
  fetchProviders: (params?: {
    search?: string;
    category_id?: string;
    location?: string;
    min_rating?: number;
    page?: number;
    size?: number;
  }) => Promise<void>;
  fetchProvider: (id: string) => Promise<void>;
}

const initialFilters: ProviderFilters = {
  search: '',
  category_id: '',
  location: '',
};

export const useProviderStore = create<ProviderState>((set) => ({
  providers: [],
  selectedProvider: null,
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  filters: { ...initialFilters },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  resetFilters: () => {
    set({ filters: { ...initialFilters } });
  },

  fetchProviders: async (params) => {
    set({ isLoading: true });
    try {
      const response = await providerService.getProviders(params);
      set({
        providers: response.providers,
        total: response.total,
        page: response.page,
        totalPages: response.total_pages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to load providers');
    }
  },

  fetchProvider: async (id: string) => {
    set({ isLoading: true });
    try {
      const provider = await providerService.getProvider(id);
      set({ selectedProvider: provider, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to load provider details');
    }
  },
}));

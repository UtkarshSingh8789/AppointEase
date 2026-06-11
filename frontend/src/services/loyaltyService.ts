import api from './api';

export interface LoyaltyAccount {
  id: string;
  user_id: string;
  points: number;
  tier: string;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  account_id: string;
  points: number;
  type: string;
  description: string;
  created_at: string;
}

interface LoyaltyTransactionList {
  transactions: LoyaltyTransaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Loyalty / wallet service */
export const loyaltyService = {
  async getAccount(): Promise<LoyaltyAccount> {
    const response = await api.get<LoyaltyAccount>('/loyalty/me');
    return response.data;
  },

  async getTransactions(params?: { page?: number; size?: number }): Promise<LoyaltyTransactionList> {
    const response = await api.get<LoyaltyTransactionList>('/loyalty/me/transactions', { params });
    return response.data;
  },

  async redeem(points: number): Promise<LoyaltyAccount> {
    const response = await api.post<LoyaltyAccount>('/loyalty/redeem', { points });
    return response.data;
  },
};

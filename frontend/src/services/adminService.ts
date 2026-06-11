import api from './api';
import type {
  AdminStats,
  AppointmentListResponse,
  AuditLogResponse,
  Category,
  CategoryPayload,
  ProviderApproval,
  Provider,
  User,
  UserListResponse,
} from '@/types';

export interface AdminUserDetail {
  user: User;
  provider?: Provider | null;
}

export interface ProviderDocumentAIResponse {
  answer: string;
  citations: Array<{
    document: string;
    path: string;
    chunk_index: number;
    excerpt: string;
    similarity: number;
  }>;
  confidence: 'low' | 'medium' | 'high';
  risk_flags: string[];
}

/** Admin service for platform management */
export const adminService = {
  /** Get all users with optional filters */
  async getUsers(params?: {
    search?: string;
    role?: string;
    page?: number;
    size?: number;
  }): Promise<UserListResponse> {
    const { size, ...rest } = params || {};
    const response = await api.get<UserListResponse>('/admin/users', {
      params: { ...rest, per_page: size },
    });
    return response.data;
  },

  /** Get a single user detail */
  async getUser(id: string): Promise<AdminUserDetail> {
    const response = await api.get<AdminUserDetail>(`/admin/users/${id}`);
    return response.data;
  },

  /** Update user active status */
  async updateUserStatus(userId: string, isActive: boolean): Promise<void> {
    await api.put(`/admin/users/${userId}/status`, { is_active: isActive });
  },

  /** Get platform statistics */
  async getStats(): Promise<AdminStats> {
    const response = await api.get<AdminStats>('/admin/stats');
    return response.data;
  },

  /** Get all appointments with filters */
  async getAppointments(params?: {
    status?: string;
    category_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<AppointmentListResponse> {
    const { size, ...rest } = params || {};
    const response = await api.get<AppointmentListResponse>('/admin/appointments', {
      params: { ...rest, per_page: size },
    });
    return response.data;
  },

  /** Get all categories */
  async getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  /** Create a new category */
  async createCategory(data: CategoryPayload): Promise<Category> {
    const response = await api.post<Category>('/admin/categories', data);
    return response.data;
  },

  /** Update a category */
  async updateCategory(id: string, data: CategoryPayload): Promise<Category> {
    const response = await api.put<Category>(`/admin/categories/${id}`, data);
    return response.data;
  },

  /** Delete a category */
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/admin/categories/${id}`);
  },

  /** Get audit logs */
  async getAuditLogs(params?: {
    page?: number;
    size?: number;
    action?: string;
  }): Promise<AuditLogResponse> {
    const response = await api.get<AuditLogResponse>('/admin/audit-logs', { params });
    return response.data;
  },

  /** Get provider applications awaiting approval */
  async getPendingProviders(): Promise<{ providers: ProviderApproval[] }> {
    const response = await api.get<ProviderApproval[]>('/admin/providers/pending');
    return { providers: response.data };
  },

  /** Approve or reject a provider application */
  async updateProviderApproval(
    providerId: string,
    data: { action: 'approve' | 'reject'; reason?: string }
  ): Promise<Provider> {
    const response = await api.post<Provider>(
      `/admin/providers/${providerId}/approval`,
      data
    );
    return response.data;
  },

  /** Rebuild document RAG index for a provider application */
  async reindexProviderDocuments(providerId: string): Promise<{
    indexed_documents: number;
    indexed_chunks: number;
    skipped_documents: Array<{ name: string; reason: string }>;
  }> {
    const response = await api.post(`/admin/providers/${providerId}/document-ai/reindex`);
    return response.data;
  },

  /** Ask a free-form super-admin question about provider onboarding documents */
  async askProviderDocuments(
    providerId: string,
    question: string
  ): Promise<ProviderDocumentAIResponse> {
    const response = await api.post<ProviderDocumentAIResponse>(
      `/admin/providers/${providerId}/document-ai/ask`,
      { question }
    );
    return response.data;
  },
};

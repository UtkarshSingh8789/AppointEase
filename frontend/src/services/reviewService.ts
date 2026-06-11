import api from './api';
import type { Review } from '@/types';

interface ReviewListResponse {
  reviews: Review[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface CreateReviewData {
  appointment_id: string;
  rating: number;
  comment?: string;
}

/** Review service for managing ratings and reviews */
export const reviewService = {
  /** Create a new review for an appointment */
  async createReview(data: CreateReviewData): Promise<Review> {
    const response = await api.post<Review>('/reviews', data);
    return response.data;
  },

  /** Get reviews for a specific provider */
  async getProviderReviews(
    providerId: string,
    params?: { page?: number; size?: number }
  ): Promise<ReviewListResponse> {
    const response = await api.get<ReviewListResponse>(`/reviews/provider/${providerId}`, {
      params,
    });
    return response.data;
  },

  /** Get current user's reviews */
  async getMyReviews(params?: { page?: number; size?: number }): Promise<ReviewListResponse> {
    const response = await api.get<ReviewListResponse>('/reviews/me', { params });
    return response.data;
  },

  /** Delete a review */
  async deleteReview(id: string): Promise<void> {
    await api.delete(`/reviews/${id}`);
  },
};

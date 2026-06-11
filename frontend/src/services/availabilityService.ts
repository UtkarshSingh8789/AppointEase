import api from './api';
import type {
  Availability,
  AvailableSlotsResponse,
  AvailabilityException,
  CreateAvailabilityPayload,
  UpdateAvailabilityPayload,
} from '@/types';

/** Availability service for managing provider schedules */
export const availabilityService = {
  /** Get weekly availability for a provider */
  async getAvailability(providerId: string): Promise<Availability[]> {
    const response = await api.get<Availability[]>(`/availability/${providerId}`);
    return response.data;
  },

  /** Create a new availability slot */
  async create(data: CreateAvailabilityPayload): Promise<Availability> {
    const response = await api.post<Availability>('/availability', data);
    return response.data;
  },

  /** Update an availability slot */
  async update(id: string, data: UpdateAvailabilityPayload): Promise<Availability> {
    const response = await api.put<Availability>(`/availability/${id}`, data);
    return response.data;
  },

  /** Delete an availability slot */
  async delete(id: string): Promise<void> {
    await api.delete(`/availability/${id}`);
  },

  /** Get available time slots for a specific date */
  async getSlots(providerId: string, date: string): Promise<AvailableSlotsResponse> {
    const response = await api.get<AvailableSlotsResponse>(
      `/availability/${providerId}/slots`,
      { params: { date } }
    );
    return response.data;
  },

  /** AI Feature #2: Get AI-ranked smart slot suggestions for a customer */
  async getSmartSlots(
    providerId: string,
    date: string
  ): Promise<{ suggestions: Array<{ start_time: string; end_time: string; is_available: boolean; ai_score: number; ai_reason: string }> }> {
    const response = await api.get(
      `/availability/${providerId}/smart-slots`,
      { params: { date } }
    );
    return response.data;
  },

  /** Get availability exceptions (blocked dates) for a provider */
  async getExceptions(providerId: string, month?: string): Promise<AvailabilityException[]> {
    const response = await api.get<AvailabilityException[]>(
      `/availability/${providerId}/exceptions`,
      { params: month ? { month } : undefined }
    );
    return response.data;
  },

  /** Create an availability exception (block a date) */
  async createException(data: {
    date: string;
    reason?: string;
    is_blocked: boolean;
  }): Promise<AvailabilityException> {
    const response = await api.post<AvailabilityException>('/availability/exceptions', data);
    return response.data;
  },

  /** Delete an availability exception */
  async deleteException(id: string): Promise<void> {
    await api.delete(`/availability/exceptions/${id}`);
  },
};

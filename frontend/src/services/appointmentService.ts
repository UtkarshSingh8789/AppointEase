import api from './api';
import type {
  Appointment,
  AppointmentListResponse,
  AppointmentComment,
  CreateAppointmentPayload,
  UpdateAppointmentStatusPayload,
  RescheduleAppointmentPayload,
  CustomerStats,
} from '@/types';

/** Appointment service for CRUD operations on appointments */
export const appointmentService = {
  /** Create a new appointment */
  async create(data: CreateAppointmentPayload): Promise<Appointment> {
    const response = await api.post<Appointment>('/appointments', data);
    return response.data;
  },

  /** Get paginated list of appointments */
  async getAppointments(params?: {
    status?: string;
    page?: number;
    size?: number;
  }): Promise<AppointmentListResponse> {
    const { size, ...rest } = params || {};
    const response = await api.get<AppointmentListResponse>('/appointments', {
      params: { ...rest, per_page: size },
    });
    return response.data;
  },

  /** Get a single appointment by ID */
  async getAppointment(id: string): Promise<Appointment> {
    const response = await api.get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  /** Update appointment status */
  async updateStatus(id: string, data: UpdateAppointmentStatusPayload): Promise<Appointment> {
    const response = await api.put<Appointment>(`/appointments/${id}/status`, data);
    return response.data;
  },

  /** Reschedule an appointment */
  async reschedule(id: string, data: RescheduleAppointmentPayload): Promise<Appointment> {
    const response = await api.put<Appointment>(`/appointments/${id}/reschedule`, data);
    return response.data;
  },

  /** Get upcoming appointments */
  async getUpcoming(): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>('/appointments/upcoming');
    return response.data;
  },

  /** Get appointment history */
  async getHistory(): Promise<Appointment[]> {
    const response = await api.get<Appointment[]>('/appointments/history');
    return response.data;
  },

  /** Get customer appointment stats */
  async getStats(): Promise<CustomerStats> {
    const response = await api.get<CustomerStats>('/appointments/stats');
    return response.data;
  },

  /** Get comments for an appointment */
  async getComments(appointmentId: string): Promise<AppointmentComment[]> {
    const response = await api.get<AppointmentComment[]>(
      `/appointments/${appointmentId}/comments`
    );
    return response.data;
  },

  /** Add a comment to an appointment */
  async addComment(
    appointmentId: string,
    data: { content: string; is_internal?: boolean }
  ): Promise<AppointmentComment> {
    const response = await api.post<AppointmentComment>(
      `/appointments/${appointmentId}/comments`,
      data
    );
    return response.data;
  },
};

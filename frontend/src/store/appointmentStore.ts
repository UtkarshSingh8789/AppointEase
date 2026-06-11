import { create } from 'zustand';
import type {
  Appointment,
  CreateAppointmentPayload,
  UpdateAppointmentStatusPayload,
  RescheduleAppointmentPayload,
} from '@/types';
import { appointmentService } from '@/services/appointmentService';
import toast from 'react-hot-toast';

interface AppointmentState {
  appointments: Appointment[];
  selectedAppointment: Appointment | null;
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  fetchAppointments: (params?: { status?: string; page?: number; size?: number }) => Promise<void>;
  fetchAppointment: (id: string) => Promise<void>;
  createAppointment: (data: CreateAppointmentPayload) => Promise<Appointment>;
  updateStatus: (id: string, data: UpdateAppointmentStatusPayload) => Promise<void>;
  reschedule: (id: string, data: RescheduleAppointmentPayload) => Promise<void>;
  fetchUpcoming: () => Promise<void>;
  fetchHistory: () => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  selectedAppointment: null,
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,

  fetchAppointments: async (params) => {
    set({ isLoading: true });
    try {
      const response = await appointmentService.getAppointments(params);
      set({
        appointments: response.appointments,
        total: response.total,
        page: response.page,
        totalPages: response.total_pages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to load appointments');
    }
  },

  fetchAppointment: async (id: string) => {
    set({ isLoading: true });
    try {
      const appointment = await appointmentService.getAppointment(id);
      set({ selectedAppointment: appointment, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to load appointment details');
    }
  },

  createAppointment: async (data: CreateAppointmentPayload) => {
    set({ isLoading: true });
    try {
      const appointment = await appointmentService.create(data);
      set({ isLoading: false });
      toast.success('Appointment booked successfully!');
      return appointment;
    } catch (error: unknown) {
      set({ isLoading: false });
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Failed to book appointment');
      throw error;
    }
  },

  updateStatus: async (id: string, data: UpdateAppointmentStatusPayload) => {
    try {
      const updated = await appointmentService.updateStatus(id, data);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
        selectedAppointment: state.selectedAppointment?.id === id ? updated : state.selectedAppointment,
      }));
      const messages: Record<string, string> = {
        confirmed: 'Appointment confirmed',
        cancelled: 'Appointment cancelled',
        completed: 'Appointment marked as completed',
        rejected: 'Appointment rejected',
      };
      toast.success(messages[data.status] || 'Status updated');
    } catch {
      toast.error('Failed to update appointment status');
    }
  },

  reschedule: async (id: string, data: RescheduleAppointmentPayload) => {
    try {
      const updated = await appointmentService.reschedule(id, data);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? updated : a)),
        selectedAppointment: state.selectedAppointment?.id === id ? updated : state.selectedAppointment,
      }));
      toast.success('Appointment rescheduled successfully');
    } catch {
      toast.error('Failed to reschedule appointment');
    }
  },

  fetchUpcoming: async () => {
    set({ isLoading: true });
    try {
      const appointments = await appointmentService.getUpcoming();
      set({ appointments, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to load upcoming appointments');
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const appointments = await appointmentService.getHistory();
      set({ appointments, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error('Failed to load appointment history');
    }
  },
}));

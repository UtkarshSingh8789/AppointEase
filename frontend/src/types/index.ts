/** User roles in the platform */
export type UserRole = 'customer' | 'provider' | 'admin';

/** Appointment status values */
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

/** User entity */
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  is_super_admin?: boolean;
  provider_id?: string | null;
  provider_is_verified?: boolean | null;
  provider_status?: 'active' | 'pending' | 'deactive' | null;
  created_at: string;
  updated_at: string;
}

/** Service category */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

/** Service provider */
export interface Provider {
  id: string;
  user_id: string;
  specialization: string;
  category_id: string;
  experience_years: number;
  location: string;
  area?: string | null;
  pincode?: string | null;
  profile_description: string | null;
  hourly_rate: number | null;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  user: User | null;
  category: Category | null;
}

/** Appointment entity */
export interface Appointment {
  id: string;
  customer_id: string;
  provider_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  cancellation_reason: string | null;
  // AI Feature #1: no-show risk score
  no_show_risk?: 'low' | 'medium' | 'high' | null;
  // AI Feature #4: post-appointment AI summary (JSON string)
  ai_summary?: string | null;
  created_at: string;
  updated_at: string;
  customer: User | null;
  provider: Provider | null;
}

/** Availability schedule entry */
export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

/** Time slot for booking */
export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

/** Available slots response */
export interface AvailableSlotsResponse {
  date: string;
  provider_id: string;
  slots: TimeSlot[];
}

/** Provider statistics */
export interface ProviderStats {
  total_appointments: number;
  completed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
  rating: number;
  total_reviews: number;
}

/** Admin platform statistics */
export interface AdminStats {
  total_users: number;
  total_providers: number;
  total_appointments: number;
  pending_appointments: number;
  completed_appointments: number;
  confirmed_appointments: number;
  cancelled_appointments: number;
  total_categories: number;
  total_reviews: number;
  average_rating: number;
  appointments_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** User list response from API */
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Provider list response from API */
export interface ProviderListResponse {
  providers: Provider[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Appointment list response from API */
export interface AppointmentListResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Auth token response */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: User;
}

/** Login credentials */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Registration data */
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
}

/** Strong password guidance helper */
export interface PasswordRules {
  minLength: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

/** Create appointment payload */
export interface CreateAppointmentPayload {
  provider_id: string;
  appointment_date: string;
  start_time: string;
  notes?: string;
  discount_amount?: number;
}

/** Update appointment status payload */
export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
  cancellation_reason?: string;
}

/** Reschedule appointment payload */
export interface RescheduleAppointmentPayload {
  appointment_date: string;
  start_time: string;
}

/** Create availability payload */
export interface CreateAvailabilityPayload {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

/** Update availability payload */
export interface UpdateAvailabilityPayload {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: number;
  is_active?: boolean;
}

/** Provider registration payload */
export interface ProviderRegisterPayload {
  specialization: string;
  category_id: string;
  experience_years: number;
  location: string;
  profile_description?: string;
  hourly_rate?: number;
  pincode?: string;
  area?: string;
}

/** Provider update payload */
export interface ProviderUpdatePayload {
  specialization?: string;
  category_id?: string;
  experience_years?: number;
  location?: string;
  profile_description?: string;
  hourly_rate?: number;
  pincode?: string;
  area?: string;
}

/** Onboarding document metadata */
export interface OnboardingDocument {
  name: string;
  path: string;
  content_type?: string | null;
  size?: number | null;
}

/** Provider approval payload from admin API */
export interface ProviderApproval {
  provider: Provider;
  avatar?: OnboardingDocument | null;
  documents: OnboardingDocument[];
  application?: Record<string, unknown> | null;
  summary?: string | null;
}

/** Category create/update payload */
export interface CategoryPayload {
  name: string;
  description?: string;
  icon?: string;
}

/** Notification entity */
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/** Review entity */
export interface Review {
  id: string;
  appointment_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  // AI Feature #6: sentiment analysis fields
  sentiment?: 'positive' | 'neutral' | 'negative' | null;
  sentiment_topics?: string | null; // JSON array string
  created_at: string;
  customer: User | null;
}

/** Availability exception (blocked dates) */
export interface AvailabilityException {
  id: string;
  provider_id: string;
  date: string;
  reason: string | null;
  is_blocked: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

/** Appointment comment */
export interface AppointmentComment {
  id: string;
  appointment_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  user: User | null;
}

/** Audit log entry */
export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

/** Audit log paginated response */
export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/** Customer appointment stats */
export interface CustomerStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  pending: number;
}

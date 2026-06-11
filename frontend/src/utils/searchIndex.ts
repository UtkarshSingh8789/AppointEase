import type { UserRole } from '@/types';

export type SearchKind = 'page' | 'feature' | 'action' | 'setting';

export interface SearchIndexItem {
  id: string;
  type: SearchKind;
  title: string;
  subtitle: string;
  path: string;
  icon: 'home' | 'users' | 'calendar' | 'heart' | 'tag' | 'trophy' | 'settings' | 'shield' | 'bell' | 'palette' | 'clock' | 'user' | 'list' | 'folder' | 'search';
  roles?: UserRole[];
  keywords: string[];
}

const allRoles: UserRole[] = ['customer', 'provider', 'admin'];

export const platformSearchIndex: SearchIndexItem[] = [
  { id: 'landing', type: 'page', title: 'Landing Page', subtitle: 'Public AppointEase home page', path: '/', icon: 'home', roles: allRoles, keywords: ['home', 'brand', 'logo', 'marketing', 'public'] },
  { id: 'settings', type: 'page', title: 'Settings', subtitle: 'Account, notifications, appearance, security', path: '/settings', icon: 'settings', roles: allRoles, keywords: ['preferences', 'profile', 'theme', 'password', 'security'] },

  { id: 'customer-dashboard', type: 'page', title: 'Dashboard', subtitle: 'Customer overview and recommendations', path: '/dashboard', icon: 'home', roles: ['customer'], keywords: ['overview', 'home', 'stats', 'recommended'] },
  { id: 'providers', type: 'page', title: 'Find Providers', subtitle: 'Search providers, categories, services, and locations', path: '/providers', icon: 'search', roles: ['customer'], keywords: ['browse', 'book', 'specialist', 'service', 'category', 'location'] },
  { id: 'my-appointments', type: 'page', title: 'My Appointments', subtitle: 'Upcoming, past, cancelled, reschedule, details', path: '/appointments', icon: 'calendar', roles: ['customer'], keywords: ['booking', 'schedule', 'history', 'cancelled', 'pending', 'confirmed'] },
  { id: 'favorites', type: 'page', title: 'Favorites', subtitle: 'Saved providers and quick booking', path: '/favorites', icon: 'heart', roles: ['customer'], keywords: ['saved', 'liked', 'providers'] },
  { id: 'rewards', type: 'page', title: 'Rewards', subtitle: 'Loyalty points, achievements, tiers', path: '/rewards', icon: 'trophy', roles: ['customer'], keywords: ['points', 'badges', 'achievements', 'loyalty', 'tier'] },
  { id: 'coupons', type: 'page', title: 'Promo Codes & Offers', subtitle: 'Coupons, discounts, promo code redemption', path: '/coupons', icon: 'tag', roles: ['customer'], keywords: ['coupon', 'discount', 'offer', 'redeem', 'promo'] },
  { id: 'wallet', type: 'page', title: 'Wallet', subtitle: 'Loyalty points balance, redeem, transactions', path: '/wallet', icon: 'trophy', roles: ['customer'], keywords: ['points', 'balance', 'redeem', 'credits', 'cashback', 'loyalty'] },
  { id: 'invoices', type: 'page', title: 'Invoices', subtitle: 'Billing history, GST invoices, receipts', path: '/invoices', icon: 'list', roles: ['customer', 'provider'], keywords: ['billing', 'receipt', 'gst', 'payment', 'invoice', 'tax'] },

  { id: 'provider-dashboard', type: 'page', title: 'Provider Dashboard', subtitle: 'Provider stats, appointments, revenue', path: '/provider/dashboard', icon: 'home', roles: ['provider'], keywords: ['overview', 'stats', 'earnings', 'analytics'] },
  { id: 'availability', type: 'page', title: 'Manage Availability', subtitle: 'Weekly availability, slots, blocked dates', path: '/provider/availability', icon: 'clock', roles: ['provider'], keywords: ['hours', 'schedule', 'slots', 'exceptions', 'vacation'] },
  { id: 'requests', type: 'page', title: 'Appointment Requests', subtitle: 'Accept or reject booking requests', path: '/provider/appointments', icon: 'calendar', roles: ['provider'], keywords: ['pending', 'confirm', 'reject', 'bookings'] },
  { id: 'provider-schedule', type: 'page', title: 'Provider Schedule', subtitle: 'Calendar view and upcoming appointments', path: '/provider/schedule', icon: 'calendar', roles: ['provider'], keywords: ['calendar', 'timeline', 'agenda'] },
  { id: 'provider-profile', type: 'page', title: 'Provider Profile', subtitle: 'Specialization, rates, location, public profile', path: '/provider/profile', icon: 'user', roles: ['provider'], keywords: ['service', 'rate', 'bio', 'public'] },

  { id: 'admin-dashboard', type: 'page', title: 'Admin Dashboard', subtitle: 'Platform overview, analytics, activity', path: '/admin/dashboard', icon: 'home', roles: ['admin'], keywords: ['stats', 'analytics', 'overview', 'activity'] },
  { id: 'admin-users', type: 'page', title: 'User Management', subtitle: 'Search, activate, deactivate users', path: '/admin/users', icon: 'users', roles: ['admin'], keywords: ['customers', 'providers', 'admin', 'status', 'roles'] },
  { id: 'admin-categories', type: 'page', title: 'Category Management', subtitle: 'Create, edit, delete service categories', path: '/admin/categories', icon: 'folder', roles: ['admin'], keywords: ['services', 'category', 'taxonomy', 'edit'] },
  { id: 'admin-appointments', type: 'page', title: 'All Appointments', subtitle: 'Platform-wide appointment operations', path: '/admin/appointments', icon: 'list', roles: ['admin'], keywords: ['bookings', 'status', 'pending', 'confirmed', 'completed'] },
  { id: 'admin-approvals', type: 'page', title: 'Provider Approvals', subtitle: 'Review onboarding applications', path: '/admin/approvals', icon: 'shield', roles: ['admin'], keywords: ['verification', 'approve', 'reject', 'providers'] },
  { id: 'admin-reports', type: 'page', title: 'Reports & Analytics', subtitle: 'Revenue, growth, business insights, export CSV', path: '/admin/reports', icon: 'list', roles: ['admin'], keywords: ['revenue', 'analytics', 'growth', 'metrics', 'export', 'csv', 'pdf', 'insights'] },

  { id: 'book-appointment', type: 'action', title: 'Book Appointment', subtitle: 'Choose a provider and appointment slot', path: '/providers', icon: 'calendar', roles: ['customer'], keywords: ['new booking', 'reserve', 'slot'] },
  { id: 'search-providers', type: 'feature', title: 'Advanced Provider Search', subtitle: 'Filter by category, location, specialization', path: '/providers', icon: 'search', roles: ['customer'], keywords: ['filter', 'location', 'category'] },
  { id: 'notifications', type: 'feature', title: 'Notifications', subtitle: 'Alerts, reminders, booking updates', path: '/settings', icon: 'bell', roles: allRoles, keywords: ['alerts', 'reminders', 'unread', 'email'] },
  { id: 'appearance', type: 'setting', title: 'Appearance Settings', subtitle: 'Light and dark theme controls', path: '/settings', icon: 'palette', roles: allRoles, keywords: ['theme', 'dark mode', 'light mode', 'contrast'] },
  { id: 'security', type: 'setting', title: 'Security Settings', subtitle: 'Password and account safety', path: '/settings', icon: 'shield', roles: allRoles, keywords: ['password', 'delete account', 'secure'] },
  { id: 'profile-settings', type: 'setting', title: 'Profile Settings', subtitle: 'Name, email, phone number', path: '/settings', icon: 'user', roles: allRoles, keywords: ['account', 'phone', 'email', 'name'] },
];

export function getSearchIndexForRole(role?: UserRole | null) {
  return platformSearchIndex.filter((item) => !item.roles || (role && item.roles.includes(role)));
}

export function itemMatchesSearch(item: SearchIndexItem, query: string) {
  const haystack = [
    item.title,
    item.subtitle,
    item.type,
    item.path,
    ...item.keywords,
  ].join(' ').toLowerCase();

  return haystack.includes(query.toLowerCase());
}

import type { UserRole } from '@/types';

export type SearchKind = 'page' | 'feature' | 'action' | 'setting' | 'ai' | 'info';

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
  // ── Public ──────────────────────────────────────────────────────────
  { id: 'landing', type: 'page', title: 'Landing Page', subtitle: 'AppointEase home — book appointments with top Indian service providers', path: '/', icon: 'home', roles: allRoles, keywords: ['home', 'brand', 'marketing', 'public', 'appointease', 'about'] },
  { id: 'login', type: 'page', title: 'Login', subtitle: 'Sign in with email/password, Google, or Microsoft', path: '/login', icon: 'user', roles: allRoles, keywords: ['sign in', 'google oauth', 'microsoft oauth', 'email login', 'forgot password'] },
  { id: 'register', type: 'page', title: 'Register', subtitle: 'Create a customer or provider account', path: '/register', icon: 'user', roles: allRoles, keywords: ['sign up', 'create account', 'new user', 'join', 'provider registration'] },
  { id: 'settings', type: 'page', title: 'Settings', subtitle: 'Account, notifications, appearance, security, password change', path: '/settings', icon: 'settings', roles: allRoles, keywords: ['preferences', 'profile', 'theme', 'dark mode', 'password', 'security', 'delete account', 'notifications'] },
  { id: 'profile', type: 'page', title: 'My Profile', subtitle: 'View and edit your personal profile, avatar', path: '/profile', icon: 'user', roles: allRoles, keywords: ['edit profile', 'avatar', 'photo', 'name', 'phone', 'account details'] },

  // ── Customer ────────────────────────────────────────────────────────
  { id: 'customer-dashboard', type: 'page', title: 'Customer Dashboard', subtitle: 'Overview of upcoming bookings, recommendations, loyalty points, and AI suggestions', path: '/dashboard', icon: 'home', roles: ['customer'], keywords: ['overview', 'home', 'stats', 'recommended', 'upcoming appointments', 'loyalty', 'quick book'] },
  { id: 'providers', type: 'page', title: 'Find Providers', subtitle: 'Search and filter providers by category, city, specialization, rating, and price', path: '/providers', icon: 'search', roles: ['customer'], keywords: ['browse', 'book', 'specialist', 'service', 'category', 'location', 'filter', 'doctor', 'lawyer', 'tutor', 'yoga', 'hair', 'dentist'] },
  { id: 'my-appointments', type: 'page', title: 'My Appointments', subtitle: 'All upcoming, past, cancelled, and pending bookings — reschedule or cancel', path: '/appointments', icon: 'calendar', roles: ['customer'], keywords: ['booking', 'schedule', 'history', 'cancelled', 'pending', 'confirmed', 'completed', 'upcoming', 'cancel', 'reschedule'] },
  { id: 'book-appointment', type: 'action', title: 'Book an Appointment', subtitle: 'Select provider, date, time slot and confirm booking', path: '/providers', icon: 'calendar', roles: ['customer'], keywords: ['new booking', 'reserve slot', 'schedule', 'time slot', 'pick date'] },
  { id: 'reschedule', type: 'action', title: 'Reschedule Appointment', subtitle: 'Change the date or time of an existing confirmed booking', path: '/appointments', icon: 'calendar', roles: ['customer'], keywords: ['change date', 'reschedule', 'move appointment', 'different time'] },
  { id: 'favorites', type: 'page', title: 'Favorites', subtitle: 'Saved providers for quick rebooking', path: '/favorites', icon: 'heart', roles: ['customer'], keywords: ['saved', 'liked', 'bookmarked', 'providers', 'favourite'] },
  { id: 'rewards', type: 'page', title: 'Rewards & Loyalty', subtitle: 'Earn and redeem loyalty points, view tier (Bronze/Silver/Gold), badges', path: '/rewards', icon: 'trophy', roles: ['customer'], keywords: ['points', 'badges', 'achievements', 'loyalty', 'tier', 'bronze', 'silver', 'gold', 'redeem', 'cashback'] },
  { id: 'coupons', type: 'page', title: 'Promo Codes & Coupons', subtitle: 'Apply discount codes like WELCOME20, SAVE10, DIWALI50 on bookings', path: '/coupons', icon: 'tag', roles: ['customer'], keywords: ['coupon', 'discount', 'offer', 'redeem', 'promo', 'welcome20', 'save10', 'percentage off', 'flat discount'] },
  { id: 'wallet', type: 'page', title: 'Wallet & Points', subtitle: 'Loyalty balance, top-up, redeem points for booking discounts', path: '/wallet', icon: 'trophy', roles: ['customer'], keywords: ['points', 'balance', 'redeem', 'credits', 'cashback', 'loyalty', 'top-up', 'razorpay'] },
  { id: 'invoices-customer', type: 'page', title: 'Invoices & Billing', subtitle: 'Download GST invoices and payment receipts for all bookings', path: '/invoices', icon: 'list', roles: ['customer'], keywords: ['billing', 'receipt', 'gst', 'payment', 'invoice', 'tax', 'download', 'pdf'] },
  { id: 'provider-detail', type: 'feature', title: 'Provider Profile Page', subtitle: 'View provider bio, rating, reviews, availability, and book directly', path: '/providers', icon: 'user', roles: ['customer'], keywords: ['provider bio', 'reviews', 'rating', 'book now', 'profile', 'availability', 'specialization'] },

  // ── Provider ─────────────────────────────────────────────────────────
  { id: 'provider-dashboard', type: 'page', title: 'Provider Dashboard', subtitle: 'Revenue stats, upcoming appointments, reviews, AI insights, availability overview', path: '/provider/dashboard', icon: 'home', roles: ['provider'], keywords: ['overview', 'stats', 'earnings', 'analytics', 'revenue', 'today appointments', 'pending requests'] },
  { id: 'availability', type: 'page', title: 'Manage Availability', subtitle: 'Set weekly slots, block dates for holidays, set vacation mode', path: '/provider/availability', icon: 'clock', roles: ['provider'], keywords: ['hours', 'schedule', 'slots', 'exceptions', 'vacation', 'block date', 'holidays', 'working hours'] },
  { id: 'requests', type: 'page', title: 'Appointment Requests', subtitle: 'Accept or reject incoming booking requests from customers', path: '/provider/appointments', icon: 'calendar', roles: ['provider'], keywords: ['pending', 'confirm', 'reject', 'accept', 'bookings', 'incoming', 'new request'] },
  { id: 'provider-schedule', type: 'page', title: 'My Schedule', subtitle: 'Calendar view of all upcoming and past appointments', path: '/provider/schedule', icon: 'calendar', roles: ['provider'], keywords: ['calendar', 'timeline', 'agenda', 'daily', 'weekly', 'monthly view'] },
  { id: 'provider-profile', type: 'page', title: 'Provider Profile', subtitle: 'Update specialization, hourly rate, bio, location, category — AI bio generator available', path: '/provider/profile', icon: 'user', roles: ['provider'], keywords: ['service', 'rate', 'bio', 'public profile', 'category', 'specialization', 'location', 'hourly rate', 'ai bio', 'improve with ai'] },
  { id: 'provider-public', type: 'page', title: 'My Public Profile', subtitle: 'View your public-facing profile as customers see it', path: '/provider/profile', icon: 'user', roles: ['provider'], keywords: ['public profile', 'customer view', 'listing', 'how i look'] },
  { id: 'invoices-provider', type: 'page', title: 'Earnings & Invoices', subtitle: 'View all paid invoices and earnings history', path: '/invoices', icon: 'list', roles: ['provider'], keywords: ['earnings', 'revenue', 'invoice', 'paid', 'payment history', 'gst'] },
  { id: 'provider-onboarding', type: 'page', title: 'Provider Onboarding', subtitle: 'Complete your professional profile and submit documents for admin approval', path: '/provider/onboarding', icon: 'user', roles: ['provider'], keywords: ['onboarding', 'approval', 'documents', 'submit', 'verification', 'kyc'] },
  { id: 'calcom-hub', type: 'feature', title: 'Cal.com Feature Hub', subtitle: 'Explore the 50 Cal.com-inspired scheduling features and see what is live today', path: '/calcom', icon: 'calendar', roles: allRoles, keywords: ['cal.com', 'feature hub', 'roadmap', 'booking links', 'team scheduling', 'calendar sync', 'webhooks', 'embed widget'] },

  // ── Admin ────────────────────────────────────────────────────────────
  { id: 'admin-dashboard', type: 'page', title: 'Admin Dashboard', subtitle: 'Platform overview — total users, appointments, revenue, fraud alerts, AI analytics', path: '/admin/dashboard', icon: 'home', roles: ['admin'], keywords: ['stats', 'analytics', 'overview', 'activity', 'platform', 'revenue', 'fraud', 'churn'] },
  { id: 'admin-users', type: 'page', title: 'User Management', subtitle: 'Search, activate/deactivate customers and providers, view profiles', path: '/admin/users', icon: 'users', roles: ['admin'], keywords: ['customers', 'providers', 'admin', 'status', 'roles', 'deactivate', 'activate', 'ban'] },
  { id: 'admin-categories', type: 'page', title: 'Category Management', subtitle: 'Create, edit, delete service categories like Healthcare, Beauty, Legal', path: '/admin/categories', icon: 'folder', roles: ['admin'], keywords: ['services', 'category', 'taxonomy', 'edit', 'create category', 'delete category'] },
  { id: 'admin-appointments', type: 'page', title: 'All Appointments', subtitle: 'Platform-wide appointment search, filter by status, provider, date range', path: '/admin/appointments', icon: 'list', roles: ['admin'], keywords: ['bookings', 'status', 'pending', 'confirmed', 'completed', 'cancelled', 'filter'] },
  { id: 'admin-approvals', type: 'page', title: 'Provider Approvals', subtitle: 'Review onboarding applications, approve or reject with AI document analysis', path: '/admin/approvals', icon: 'shield', roles: ['admin'], keywords: ['verification', 'approve', 'reject', 'providers', 'onboarding', 'documents', 'ai verify', 'rag'] },
  { id: 'admin-reports', type: 'page', title: 'Reports & Analytics', subtitle: 'Revenue charts, user growth, category demand, top providers — export CSV', path: '/admin/reports', icon: 'list', roles: ['admin'], keywords: ['revenue', 'analytics', 'growth', 'metrics', 'export', 'csv', 'pdf', 'insights', 'charts', 'monthly'] },

  // ── AI Features ──────────────────────────────────────────────────────
  { id: 'ai-chatbot', type: 'ai', title: 'AI Assistant (Chatbot)', subtitle: 'Ask anything about bookings, providers, or the platform — powered by Gemini/Grok', path: '/dashboard', icon: 'search', roles: allRoles, keywords: ['chatbot', 'ai', 'gemini', 'grok', 'ask', 'help', 'assistant', 'question', 'smart search'] },
  { id: 'ai-smart-slots', type: 'ai', title: 'Smart Slot Suggestions', subtitle: 'AI recommends best booking times based on your past behaviour', path: '/providers', icon: 'clock', roles: ['customer'], keywords: ['smart slots', 'ai recommendation', 'best time', 'suggested slots'] },
  { id: 'ai-no-show', type: 'ai', title: 'No-Show Predictor', subtitle: 'AI predicts likelihood of customer no-show and alerts providers', path: '/provider/appointments', icon: 'bell', roles: ['provider'], keywords: ['no show', 'prediction', 'ai', 'attendance', 'alert'] },
  { id: 'ai-sentiment', type: 'ai', title: 'Review Sentiment Analysis', subtitle: 'AI analyses customer reviews for positive/negative themes', path: '/provider/dashboard', icon: 'list', roles: ['provider', 'admin'], keywords: ['sentiment', 'review analysis', 'ai', 'themes', 'feedback'] },
  { id: 'ai-bio', type: 'ai', title: 'AI Bio Generator', subtitle: 'Generate a professional SEO-friendly provider bio with one click', path: '/provider/profile', icon: 'user', roles: ['provider'], keywords: ['bio generator', 'ai bio', 'profile description', 'improve with ai'] },
  { id: 'ai-pricing', type: 'ai', title: 'Dynamic Pricing Suggestions', subtitle: 'AI suggests optimal hourly rate based on category, location, and demand', path: '/provider/profile', icon: 'tag', roles: ['provider', 'admin'], keywords: ['pricing', 'rate suggestion', 'ai pricing', 'hourly rate'] },
  { id: 'ai-nudges', type: 'ai', title: 'Personalised Nudges', subtitle: 'AI sends personalised reminders to re-engage inactive customers', path: '/dashboard', icon: 'bell', roles: ['customer'], keywords: ['nudge', 'reminder', 'personalised', 're-engage', 'ai notification'] },
  { id: 'ai-fraud', type: 'ai', title: 'Fraud Detection', subtitle: 'Admin AI tool that flags suspicious accounts and bulk cancellations', path: '/admin/dashboard', icon: 'shield', roles: ['admin'], keywords: ['fraud', 'suspicious', 'fake', 'bulk cancel', 'alert', 'ai security'] },
  { id: 'ai-churn', type: 'ai', title: 'Churn Predictor', subtitle: 'Identifies customers likely to leave the platform', path: '/admin/dashboard', icon: 'users', roles: ['admin'], keywords: ['churn', 'inactive', 'lost users', 'retention', 'ai prediction'] },
  { id: 'ai-revenue', type: 'ai', title: 'Revenue Forecasting', subtitle: '30-day AI revenue prediction from historical booking trends', path: '/admin/reports', icon: 'list', roles: ['admin'], keywords: ['revenue forecast', 'ai prediction', 'future revenue', 'analytics'] },
  { id: 'ai-document-rag', type: 'ai', title: 'Document AI (RAG)', subtitle: 'Ask questions about provider onboarding documents — grounded in uploaded files', path: '/admin/approvals', icon: 'folder', roles: ['admin'], keywords: ['rag', 'document ai', 'onboarding documents', 'verify', 'ask ai', 'certificate'] },

  // ── Info / FAQ ───────────────────────────────────────────────────────
  { id: 'info-categories', type: 'info', title: 'Service Categories', subtitle: 'Healthcare, Beauty, Legal, Education, Fitness, Finance, Pet Care and 50+ more', path: '/providers', icon: 'folder', roles: allRoles, keywords: ['category list', 'services available', 'healthcare', 'beauty', 'yoga', 'dentist', 'lawyer', 'tutor', 'interior design', 'fitness'] },
  { id: 'info-pricing', type: 'info', title: 'Platform Pricing', subtitle: 'Free to use for customers; providers pay no platform fee currently', path: '/', icon: 'tag', roles: allRoles, keywords: ['price', 'fee', 'free', 'subscription', 'cost', 'platform fee', 'commission'] },
  { id: 'info-payment', type: 'info', title: 'Payments', subtitle: 'Payments via Razorpay — UPI, cards, net banking supported', path: '/wallet', icon: 'tag', roles: allRoles, keywords: ['razorpay', 'upi', 'payment gateway', 'credit card', 'net banking', 'pay'] },
  { id: 'info-cancellation', type: 'info', title: 'Cancellation Policy', subtitle: 'Cancel or reschedule upcoming appointments before the appointment time', path: '/appointments', icon: 'calendar', roles: ['customer'], keywords: ['cancel', 'refund', 'reschedule', 'policy', 'cancellation'] },
  { id: 'notifications-panel', type: 'feature', title: 'Notifications', subtitle: 'Real-time alerts for booking confirmations, reminders, and system updates', path: '/settings', icon: 'bell', roles: allRoles, keywords: ['alerts', 'reminders', 'unread', 'email', 'notification bell', 'updates'] },
  { id: 'appearance', type: 'setting', title: 'Appearance / Theme', subtitle: 'Toggle between light and dark mode', path: '/settings', icon: 'palette', roles: allRoles, keywords: ['theme', 'dark mode', 'light mode', 'contrast', 'appearance'] },
  { id: 'security', type: 'setting', title: 'Security Settings', subtitle: 'Change password, delete account', path: '/settings', icon: 'shield', roles: allRoles, keywords: ['password', 'delete account', 'secure', 'change password'] },
  { id: 'profile-settings', type: 'setting', title: 'Profile Settings', subtitle: 'Update name, email, phone number', path: '/settings', icon: 'user', roles: allRoles, keywords: ['account', 'phone', 'email', 'name', 'update profile'] },
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

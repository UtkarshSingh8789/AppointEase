import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Settings,
  UserCircle,
  List,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CalendarClock,
  Heart,
  Trophy,
  Wallet,
  FileText,
  CalendarPlus,
  BarChart3,
  ShieldCheck,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Logo } from '@/components/ui/Logo';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const customerSections: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Cal.com Hub', path: '/calcom', icon: <Sparkles className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Booking',
    items: [
      { label: 'Find Providers', path: '/providers', icon: <Users className="w-5 h-5" /> },
      { label: 'My Appointments', path: '/appointments', icon: <Calendar className="w-5 h-5" /> },
      { label: 'Favorites', path: '/favorites', icon: <Heart className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Rewards & Billing',
    items: [
      { label: 'Rewards', path: '/rewards', icon: <Trophy className="w-5 h-5" /> },
      { label: 'Wallet', path: '/wallet', icon: <Wallet className="w-5 h-5" /> },
      { label: 'Invoices', path: '/invoices', icon: <FileText className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
      { label: 'Profile', path: '/profile', icon: <UserCircle className="w-5 h-5" /> },
    ],
  },
];

const providerSections: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', path: '/provider/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Cal.com Hub', path: '/calcom', icon: <Sparkles className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Manage',
    items: [
      { label: 'Requests', path: '/provider/appointments', icon: <CalendarCheck className="w-5 h-5" /> },
      { label: 'Schedule', path: '/provider/schedule', icon: <CalendarClock className="w-5 h-5" /> },
      { label: 'Availability', path: '/provider/availability', icon: <Clock className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Business',
    items: [
      { label: 'Invoices', path: '/invoices', icon: <FileText className="w-5 h-5" /> },
      { label: 'Integrations', path: '/provider/integrations', icon: <LinkIcon className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
      { label: 'Profile', path: '/provider/profile', icon: <UserCircle className="w-5 h-5" /> },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: 'Cal.com Hub', path: '/calcom', icon: <Sparkles className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Management',
    items: [
      { label: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
      { label: 'Categories', path: '/admin/categories', icon: <FolderOpen className="w-5 h-5" /> },
      { label: 'Appointments', path: '/admin/appointments', icon: <List className="w-5 h-5" /> },
      { label: 'Approvals', path: '/admin/approvals', icon: <ShieldCheck className="w-5 h-5" /> },
      { label: 'Reports', path: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Account',
    items: [
      { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
      { label: 'Profile', path: '/profile', icon: <UserCircle className="w-5 h-5" /> },
    ],
  },
];

const sectionsByRole: Record<UserRole, NavSection[]> = {
  customer: customerSections,
  provider: providerSections,
  admin: adminSections,
};

/** Collapsible sidebar navigation with role-based, grouped menu items */
export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthStore();

  const sections = user ? sectionsByRole[user.role] : [];

  // Primary CTA per role
  const primaryCta =
    user?.role === 'provider'
      ? { label: 'Set Availability', path: '/provider/availability', icon: <CalendarPlus className="w-4 h-4" /> }
      : user?.role === 'admin'
      ? { label: 'View Reports', path: '/admin/reports', icon: <LayoutDashboard className="w-4 h-4" /> }
      : { label: 'Book Appointment', path: '/providers', icon: <CalendarPlus className="w-4 h-4" /> };

  return (
    <aside
      className={`
        hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        {!collapsed ? (
          <Logo size="md" linkTo="/" />
        ) : (
          <Logo size="sm" showText={false} linkTo="/" className="mx-auto" />
        )}
      </div>

      {/* Primary CTA */}
      {!collapsed && primaryCta && (
        <div className="px-3 pt-4">
          <Link
            to={primaryCta.path}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-semibold border transition-colors"
            style={{ backgroundColor: '#000', color: '#fff', borderColor: '#000' }}
          >
            {primaryCta.icon}
            {primaryCta.label}
          </Link>
        </div>
      )}

      {/* Navigation (grouped) */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.heading} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {section.heading}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors
                    ${isActive
                      ? 'sidebar-active'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }
                    ${collapsed ? 'justify-center' : ''}`
                  }
                  style={({ isActive }) => isActive ? { backgroundColor: '#171717', color: '#fff' } : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

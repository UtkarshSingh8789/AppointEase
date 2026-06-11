import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  UserCircle,
  List,
  FolderOpen,
  X,
  CalendarCheck,
  CalendarClock,
  Settings,
  Heart,
  Trophy,
  Wallet,
  FileText,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const customerNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Find Providers', path: '/providers', icon: <Users className="w-5 h-5" /> },
  { label: 'My Appointments', path: '/appointments', icon: <Calendar className="w-5 h-5" /> },
  { label: 'Favorites', path: '/favorites', icon: <Heart className="w-5 h-5" /> },
  { label: 'Rewards', path: '/rewards', icon: <Trophy className="w-5 h-5" /> },
  { label: 'Wallet', path: '/wallet', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Invoices', path: '/invoices', icon: <FileText className="w-5 h-5" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
  { label: 'Profile', path: '/profile', icon: <UserCircle className="w-5 h-5" /> },
];

const providerNav: NavItem[] = [
  { label: 'Dashboard', path: '/provider/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Requests', path: '/provider/appointments', icon: <CalendarCheck className="w-5 h-5" /> },
  { label: 'Schedule', path: '/provider/schedule', icon: <CalendarClock className="w-5 h-5" /> },
  { label: 'Availability', path: '/provider/availability', icon: <Clock className="w-5 h-5" /> },
  { label: 'Invoices', path: '/invoices', icon: <FileText className="w-5 h-5" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
  { label: 'Profile', path: '/provider/profile', icon: <UserCircle className="w-5 h-5" /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Categories', path: '/admin/categories', icon: <FolderOpen className="w-5 h-5" /> },
  { label: 'Appointments', path: '/admin/appointments', icon: <List className="w-5 h-5" /> },
  { label: 'Approvals', path: '/admin/approvals', icon: <ShieldCheck className="w-5 h-5" /> },
  { label: 'Reports', path: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" /> },
  { label: 'Profile', path: '/profile', icon: <UserCircle className="w-5 h-5" /> },
];

const navByRole: Record<UserRole, NavItem[]> = {
  customer: customerNav,
  provider: providerNav,
  admin: adminNav,
};

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Mobile sidebar overlay navigation */
export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const navItems = user ? navByRole[user.role] : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Sidebar */}
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-800">
          <NavLink to="/" onClick={onClose} className="text-xl font-bold text-primary-600">
            AppointEase
          </NavLink>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="py-4 px-3 space-y-1" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? ''
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`
              }
              style={({ isActive }) => isActive ? { backgroundColor: '#171717', color: '#fff' } : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, Calendar, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

interface NavItem {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  path: string;
  isFab?: boolean;
}

/** Fixed bottom navigation bar for mobile devices */
export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const customerItems: NavItem[] = [
    {
      icon: <Home className="w-5 h-5" />,
      activeIcon: <Home className="w-5 h-5 fill-current" />,
      label: 'Home',
      path: '/dashboard',
    },
    {
      icon: <Search className="w-5 h-5" />,
      activeIcon: <Search className="w-5 h-5" />,
      label: 'Search',
      path: '/providers',
    },
    {
      icon: <Plus className="w-6 h-6" />,
      activeIcon: <Plus className="w-6 h-6" />,
      label: 'Book',
      path: '/providers',
      isFab: true,
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      activeIcon: <Calendar className="w-5 h-5 fill-current" />,
      label: 'Calendar',
      path: '/appointments',
    },
    {
      icon: <User className="w-5 h-5" />,
      activeIcon: <User className="w-5 h-5 fill-current" />,
      label: 'Profile',
      path: '/favorites',
    },
  ];

  const providerItems: NavItem[] = [
    {
      icon: <Home className="w-5 h-5" />,
      activeIcon: <Home className="w-5 h-5 fill-current" />,
      label: 'Home',
      path: '/provider/dashboard',
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      activeIcon: <Calendar className="w-5 h-5 fill-current" />,
      label: 'Schedule',
      path: '/provider/schedule',
    },
    {
      icon: <Plus className="w-6 h-6" />,
      activeIcon: <Plus className="w-6 h-6" />,
      label: 'Availability',
      path: '/provider/availability',
      isFab: true,
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      activeIcon: <Calendar className="w-5 h-5 fill-current" />,
      label: 'Requests',
      path: '/provider/appointments',
    },
    {
      icon: <User className="w-5 h-5" />,
      activeIcon: <User className="w-5 h-5 fill-current" />,
      label: 'Profile',
      path: '/provider/profile',
    },
  ];

  const items = user?.role === 'provider' ? providerItems : customerItems;

  // Don't show for admin
  if (user?.role === 'admin') return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;

          if (item.isFab) {
            return (
              <Link
                key={item.label}
                to={item.path}
                className={cn(
                  'flex items-center justify-center w-12 h-12 -mt-5 rounded-full',
                  'bg-gradient-to-r from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-500/30',
                  'hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200'
                )}
                aria-label={item.label}
              >
                {item.icon}
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 py-1 transition-colors',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive ? item.activeIcon : item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

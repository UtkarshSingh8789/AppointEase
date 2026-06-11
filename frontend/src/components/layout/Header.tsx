import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, User, Sun, Moon, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationPanel } from './NotificationPanel';
import { InlineSearch } from './InlineSearch';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/DropdownMenu';
import { getProviderImage } from '@/utils/providerImages';

interface HeaderProps {
  onMenuToggle?: () => void;
}

/** Top header bar with user info, notifications, theme toggle, command palette, and logout */
export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showNotifications && notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Fetch unread count on mount and poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Cmd+K keyboard shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
    setTimeout(() => { window.location.reload(); }, 100);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Left side - mobile menu + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="lg:hidden text-lg font-bold text-primary-600">
              AppointEase
            </Link>
          </div>

          {/* Center - Inline universal search */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <InlineSearch onNavigate={() => {}} />
          </div>

          {/* Right side - theme toggle + notifications + user */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 relative transition-colors"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-bounce-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {/* User dropdown using Radix DropdownMenu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="User menu"
                >
                  <Avatar
                    name={user?.full_name || 'User'}
                    src={getProviderImage(user?.id || 'user')}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.full_name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    navigate(user?.role === 'provider' ? '/provider/profile' : '/profile');
                  }}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                {/* <DropdownMenuItem onSelect={() => setCommandPaletteOpen(true)}>
                  <Settings className="w-4 h-4" />
                  Command Palette
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => setShowLogoutConfirm(true)}>
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Breadcrumbs below header */}
        <div className="px-4 sm:px-6 pb-2">
          <Breadcrumbs />
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign out?"
        message="You will leave your current workspace and return to the login page."
        confirmLabel="Sign out"
        variant="warning"
      />
    </>
  );
};

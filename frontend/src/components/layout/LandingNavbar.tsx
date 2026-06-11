import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Logo } from '@/components/ui/Logo';
import type { UserRole } from '@/types';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
];

const roleDashboardPath: Record<UserRole, string> = {
  customer: '/dashboard',
  provider: '/provider/dashboard',
  admin: '/admin/dashboard',
};

/** Theme toggle button for the landing page */
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
};

/** Sticky landing page navbar with smooth scroll and mobile menu */
export const LandingNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('features');
  const { isAuthenticated, user } = useAuthStore();
  const dashboardPath = user ? roleDashboardPath[user.role] ?? '/dashboard' : '/dashboard';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const sectionIds = navLinks.map((link) => link.href.replace('#', ''));
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target?.id) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      {
        root: null,
        threshold: [0.25, 0.4, 0.6],
        rootMargin: '-20% 0px -55% 0px',
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (href: string) => {
    const id = href.replace('#', '');
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm'
            : 'bg-transparent'
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Logo size="md" linkTo="/" />

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                    className={cn(
                      'relative text-sm font-medium transition-all duration-200 py-1',
                      'after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full',
                      activeSection === link.href.replace('#', '')
                        ? 'text-black dark:text-white after:w-full'
                        : isScrolled
                          ? 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                          : 'text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white'
                    )}
                  >
                    {link.label}
                </button>
              ))}
            </div>

            {/* Auth buttons + theme toggle */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme toggle */}
              <ThemeToggle />
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="px-5 py-2.5 text-sm font-semibold border transition-colors"
                  style={{ backgroundColor: '#fff', color: '#000', borderColor: '#000' }}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 text-sm font-semibold border transition-colors"
                    style={{ backgroundColor: '#000', color: '#fff', borderColor: '#000' }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white dark:bg-gray-900 shadow-2xl md:hidden"
            >
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center justify-between mb-8">
                  <Logo size="sm" linkTo="/" />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                  {navLinks.map((link) => (
                    <button
                    key={link.href}
                    onClick={() => scrollToSection(link.href)}
                    className={cn(
                      'text-left px-4 py-3 rounded-lg font-medium transition-colors',
                      activeSection === link.href.replace('#', '')
                        ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    {link.label}
                  </button>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-3">
                  {isAuthenticated ? (
                    <Link
                      to={dashboardPath}
                      className="w-full px-4 py-3 text-center text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-violet-600 rounded-lg hover:from-primary-700 hover:to-violet-700 transition-all"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Go to Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="w-full px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="w-full px-4 py-3 text-center text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-violet-600 rounded-lg hover:from-primary-700 hover:to-violet-700 transition-all"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Get Started Free
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

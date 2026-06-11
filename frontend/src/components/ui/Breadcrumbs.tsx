import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Route-to-label mapping for breadcrumb display */
const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  providers: 'Providers',
  appointments: 'Appointments',
  favorites: 'Favorites',
  book: 'Book Appointment',
  provider: 'Provider',
  admin: 'Admin',
  users: 'Users',
  categories: 'Categories',
  availability: 'Availability',
  schedule: 'Schedule',
  profile: 'Profile',
};

interface BreadcrumbsProps {
  className?: string;
}

/** Auto-generated breadcrumb navigation from current route */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ className }) => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on root-level pages
  if (pathSegments.length <= 1) return null;

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment;
    const isLast = index === pathSegments.length - 1;
    // Skip UUID-like segments in display
    const isId = segment.length > 20 || /^[0-9a-f-]{36}$/.test(segment);

    return { path, label: isId ? 'Details' : label, isLast, isId };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        to="/"
        className="flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {breadcrumbs.map((crumb) => (
        <React.Fragment key={crumb.path}>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          {crumb.isLast ? (
            <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[150px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

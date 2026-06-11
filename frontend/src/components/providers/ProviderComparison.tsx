import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  MapPin,
  Minus,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { Provider } from '@/types';

interface ProviderComparisonProps {
  providers: Provider[];
  onRemove: (providerId: string) => void;
  onClose: () => void;
}

/** Side-by-side provider comparison panel */
export const ProviderComparison: React.FC<ProviderComparisonProps> = ({
  providers,
  onRemove,
  onClose,
}) => {
  if (providers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Compare Providers ({providers.length}/3)
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Select up to 3 providers to compare
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <ComparisonCard
              key={provider.id}
              provider={provider}
              onRemove={() => onRemove(provider.id)}
            />
          ))}

          {/* Empty slots */}
          {Array.from({ length: 3 - providers.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl"
            >
              <div className="text-center">
                <Plus className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                <p className="text-xs text-gray-400 dark:text-gray-500">Add provider</p>
              </div>
            </div>
          ))}
        </div>

        {/* Compare button */}
        {providers.length >= 2 && (
          <div className="mt-4 flex justify-center">
            <Link to={`/compare?ids=${providers.map((p) => p.id).join(',')}`}>
              <Button size="sm">
                View Full Comparison
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/** Individual comparison card */
const ComparisonCard: React.FC<{
  provider: Provider;
  onRemove: () => void;
}> = ({ provider, onRemove }) => (
  <div className="relative p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
    <button
      onClick={onRemove}
      className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      aria-label={`Remove ${provider.user?.full_name} from comparison`}
    >
      <X className="w-3.5 h-3.5" />
    </button>

    <div className="flex items-center gap-3">
      <Avatar
        name={provider.user?.full_name || 'Provider'}
        src={provider.id ? getProviderImage(provider.id) : undefined}
        size="sm"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {provider.user?.full_name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {provider.specialization}
        </p>
      </div>
    </div>

    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div>
        <div className="flex items-center justify-center gap-0.5">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {provider.rating.toFixed(1)}
          </span>
        </div>
        <p className="text-[10px] text-gray-400">Rating</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          {provider.experience_years}y
        </p>
        <p className="text-[10px] text-gray-400">Exp.</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          {provider.hourly_rate ? formatCurrency(provider.hourly_rate) : 'N/A'}
        </p>
        <p className="text-[10px] text-gray-400">Rate</p>
      </div>
    </div>
  </div>
);

/** Full comparison page content */
export const ProviderComparisonTable: React.FC<{ providers: Provider[] }> = ({
  providers,
}) => {
  if (providers.length < 2) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Select at least 2 providers to compare
        </p>
      </div>
    );
  }

  const rows: { label: string; getValue: (p: Provider) => React.ReactNode }[] = [
    {
      label: 'Specialization',
      getValue: (p) => p.specialization,
    },
    {
      label: 'Location',
      getValue: (p) => (
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {p.location}
        </span>
      ),
    },
    {
      label: 'Experience',
      getValue: (p) => `${p.experience_years} years`,
    },
    {
      label: 'Rating',
      getValue: (p) => (
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          {p.rating.toFixed(1)} ({p.total_reviews} reviews)
        </span>
      ),
    },
    {
      label: 'Hourly Rate',
      getValue: (p) =>
        p.hourly_rate ? (
          <span className="font-semibold">{formatCurrency(p.hourly_rate)}/hr</span>
        ) : (
          'N/A'
        ),
    },
    {
      label: 'Verified',
      getValue: (p) =>
        p.is_verified ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <Minus className="w-4 h-4 text-gray-300" />
        ),
    },
    {
      label: 'Category',
      getValue: (p) => p.category?.name || '—',
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
              Feature
            </th>
            {providers.map((provider) => (
              <th key={provider.id} className="p-3 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Avatar
                    name={provider.user?.full_name || 'Provider'}
                    src={provider.id ? getProviderImage(provider.id) : undefined}
                    size="md"
                  />
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {provider.user?.full_name}
                  </p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.label}
              className={cn(
                'border-t border-gray-100 dark:border-gray-800',
                index % 2 === 0 && 'bg-gray-50/50 dark:bg-gray-800/30'
              )}
            >
              <td className="p-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                {row.label}
              </td>
              {providers.map((provider) => (
                <td
                  key={provider.id}
                  className="p-3 text-center text-sm text-gray-900 dark:text-gray-100"
                >
                  {row.getValue(provider)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td className="p-3" />
            {providers.map((provider) => (
              <td key={provider.id} className="p-3 text-center">
                <Link to={`/book/${provider.id}`}>
                  <Button size="sm" className="w-full">
                    Book Now
                  </Button>
                </Link>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

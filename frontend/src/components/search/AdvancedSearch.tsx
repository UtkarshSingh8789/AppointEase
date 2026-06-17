import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock,
  Search,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { providerService } from '@/services/providerService';
import { cn } from '@/utils/cn';
import { debounce, formatCurrency } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { Provider } from '@/types';

interface PlatformSuggestion {
  label: string;
  url: string;
}

const PLATFORM_LINKS = [
  { label: 'My Appointments', url: '/appointments', keywords: ['appointment', 'booking', 'schedule', 'calendar'] },
  { label: 'Dashboard', url: '/dashboard', keywords: ['dashboard', 'home', 'overview'] },
  { label: 'Profile Settings', url: '/profile', keywords: ['profile', 'account', 'settings'] },
  { label: 'My Wallet', url: '/wallet', keywords: ['wallet', 'balance', 'money', 'payment'] },
  { label: 'Favorites', url: '/favorites', keywords: ['favorite', 'saved', 'bookmark'] },
];

function getPlatformSuggestions(query: string): PlatformSuggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return PLATFORM_LINKS
    .filter(link => link.keywords.some(kw => kw.includes(q) || q.includes(kw)))
    .map(({ label, url }) => ({ label, url }));
}

interface AdvancedSearchProps {
  onSearch?: (query: string) => void;
  className?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = 'appointease_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const searches = getRecentSearches().filter((s) => s.query !== query);
  searches.unshift({ query, timestamp: Date.now() });
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES))
  );
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

/** Advanced search with autocomplete suggestions, recent searches, and filter panel */
export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  className,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Provider[]>([]);
  const [platformSuggestions, setPlatformSuggestions] = useState<PlatformSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(getRecentSearches());

  // Filter state (used for suggestion fetching)
  const [selectedCategory] = useState('');
  const [selectedLocation] = useState('');

  const showDropdown = isFocused && (query.length > 0 || recentSearches.length > 0);

  // Fetch suggestions with debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setPlatformSuggestions([]);
        return;
      }
      setPlatformSuggestions(getPlatformSuggestions(searchQuery));
      setIsLoadingSuggestions(true);
      try {
        const response = await providerService.getProviders({
          search: searchQuery,
          category_id: selectedCategory || undefined,
          location: selectedLocation || undefined,
          page: 1,
          size: 5,
        });
        setSuggestions(response.providers);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300),
    [selectedCategory, selectedLocation]
  );

  useEffect(() => {
    fetchSuggestions(query);
  }, [query, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
      onSearch?.(query.trim());
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (provider: Provider) => {
    setIsFocused(false);
    navigate(`/providers/${provider.id}`);
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    onSearch?.(search);
    setIsFocused(false);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    onSearch?.('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search providers, specializations, locations..."
          className={cn(
            'w-full pl-12 pr-24 py-3 border rounded-xl text-sm transition-all duration-200',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            isFocused
              ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-lg'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          )}
          aria-label="Search providers"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => { if (query.trim()) { handleSubmit({ preventDefault: () => {} } as React.FormEvent); } }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Dropdown with suggestions / recent searches */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50"
            role="listbox"
          >
            {/* Recent searches (when no query) */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recent Searches
                  </span>
                  <button
                    onClick={handleClearRecent}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {recentSearches.map((search) => (
                  <button
                    key={search.timestamp}
                    onClick={() => handleRecentSearchClick(search.query)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="option"
                  >
                    <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {search.query}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading state */}
            {isLoadingSuggestions && query.length >= 2 && (
              <div className="p-4 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Searching...</span>
              </div>
            )}

            {/* Platform Suggestions */}
            {!isLoadingSuggestions && platformSuggestions.length > 0 && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <span className="block px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quick Links
                </span>
                {platformSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.url}
                    onClick={() => {
                      setIsFocused(false);
                      navigate(suggestion.url);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="option"
                  >
                    <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {suggestion.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {!isLoadingSuggestions && suggestions.length > 0 && (
              <div className="p-2">
                <span className="block px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Providers
                </span>
                {suggestions.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => handleSuggestionClick(provider)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="option"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <img
                        src={getProviderImage(provider.id)}
                        alt={provider.user?.full_name || 'Provider'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {provider.user?.full_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {provider.specialization} • {provider.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{provider.rating.toFixed(1)}</span>
                    </div>
                    {provider.hourly_rate && (
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(provider.hourly_rate)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {!isLoadingSuggestions && query.length >= 2 && suggestions.length === 0 && platformSuggestions.length === 0 && (
              <div className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No providers found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Try a different search term or adjust filters
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

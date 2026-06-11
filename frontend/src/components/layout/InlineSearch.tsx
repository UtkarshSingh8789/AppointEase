import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Clock,
  FolderOpen,
  Heart,
  Home,
  List,
  Palette,
  Search,
  Settings,
  Shield,
  Tag,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { providerService } from '@/services/providerService';
import { adminService } from '@/services/adminService';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { debounce } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import {
  getSearchIndexForRole,
  itemMatchesSearch,
  type SearchIndexItem,
} from '@/utils/searchIndex';
import type { Provider } from '@/types';

const iconMap: Record<SearchIndexItem['icon'], React.ReactNode> = {
  home: <Home className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />,
  heart: <Heart className="w-4 h-4" />,
  tag: <Tag className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
  palette: <Palette className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  user: <User className="w-4 h-4" />,
  list: <List className="w-4 h-4" />,
  folder: <FolderOpen className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
};

interface ProviderHit {
  id: string;
  name: string;
  subtitle: string;
  path: string;
}

interface CategoryHit {
  id: string;
  name: string;
  subtitle: string;
  path: string;
}

interface UserHit {
  id: string;
  name: string;
  subtitle: string;
  path: string;
}

interface InlineSearchProps {
  onNavigate: () => void;
}

/** Inline universal search that stays in its own space — no overlay/blur.
 *  Searches the full platform index (pages, features, settings, actions)
 *  AND live provider data. */
export const InlineSearch: React.FC<InlineSearchProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [providerHits, setProviderHits] = useState<ProviderHit[]>([]);
  const [categoryHits, setCategoryHits] = useState<CategoryHit[]>([]);
  const [userHits, setUserHits] = useState<UserHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const roleIndex = useMemo(() => getSearchIndexForRole(user?.role), [user?.role]);

  // Static (index) matches
  const indexMatches = useMemo(() => {
    if (!query.trim()) return [];
    return roleIndex.filter((item) => itemMatchesSearch(item, query)).slice(0, 8);
  }, [query, roleIndex]);

  // Live provider search (only for customers / admins)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const searchProviders = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2 || user?.role === 'provider') {
        setProviderHits([]);
        setCategoryHits([]);
        setUserHits([]);
        setIsSearching(false);
        return;
      }
      try {
        const [providerResponse, categoryResponse] = await Promise.all([
          providerService.getProviders({ search: q, page: 1, size: 5 }),
          user?.role === 'admin' ? adminService.getCategories() : Promise.resolve([]),
        ]);
        const userResponse = user?.role === 'admin'
          ? await adminService.getUsers({ search: q, page: 1, size: 5 })
          : null;

        const categoryQuery = q.toLowerCase();

        setProviderHits(
          providerResponse.providers.map((p: Provider) => ({
            id: `prov-${p.id}`,
            name: p.user?.full_name || 'Provider',
            subtitle: `${p.specialization} • ${p.location}`,
            path: `/providers/${p.id}`,
          }))
        );
        setCategoryHits(
          user?.role === 'admin'
            ? categoryResponse
                .filter((category) =>
                  [category.name, category.description || ''].join(' ').toLowerCase().includes(categoryQuery)
                )
                .slice(0, 5)
                .map((category) => ({
                  id: `cat-${category.id}`,
                  name: category.name,
                  subtitle: category.description || 'Service category',
                  path: `/admin/categories?search=${encodeURIComponent(category.name)}`,
                }))
            : []
        );
        setUserHits(
          user?.role === 'admin' && userResponse
            ? userResponse.users.map((item) => ({
                id: `user-${item.id}`,
                name: item.full_name,
                subtitle: `${item.email} • ${item.role}`,
                path: `/admin/users/${item.id}`,
              }))
            : []
        );
      } catch {
        setProviderHits([]);
        setCategoryHits([]);
        setUserHits([]);
      } finally {
        setIsSearching(false);
      }
    }, 250),
    [user?.role]
  );

  useEffect(() => {
    if (!query.trim()) {
      setProviderHits([]);
      setCategoryHits([]);
      setUserHits([]);
      setShowResults(false);
      setSelectedIndex(-1);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    searchProviders(query);
  }, [query, searchProviders]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Flat list for keyboard navigation: providers first, then index
  const flatResults = useMemo(
    () => [
      ...providerHits.map((p) => ({ kind: 'provider' as const, path: p.path, label: p.name })),
      ...categoryHits.map((c) => ({ kind: 'category' as const, path: c.path, label: c.name })),
      ...userHits.map((u) => ({ kind: 'user' as const, path: u.path, label: u.name })),
      ...indexMatches.map((i) => ({ kind: 'index' as const, path: i.path, label: i.title })),
    ],
    [providerHits, categoryHits, userHits, indexMatches]
  );

  const go = (path: string) => {
    navigate(path);
    setQuery('');
    setShowResults(false);
    setSelectedIndex(-1);
    onNavigate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
      e.preventDefault();
      go(flatResults[selectedIndex].path);
    } else if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  const hasResults = providerHits.length > 0 || categoryHits.length > 0 || userHits.length > 0 || indexMatches.length > 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search anything — pages, providers, features…"
          className={cn(
            'w-full pl-9 pr-8 py-2 text-sm transition-all',
            'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 focus:border-black dark:focus:border-white'
          )}
          aria-label="Universal search"
          aria-expanded={showResults}
          role="combobox"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setShowResults(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown — anchored under the input, no full-page overlay */}
      {showResults && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl max-h-96 overflow-y-auto z-50"
          role="listbox"
        >
          {isSearching && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Searching…
            </div>
          )}

          {!isSearching && !hasResults && query.length >= 1 && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Providers */}
          {providerHits.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Providers
              </div>
              {providerHits.map((p, index) => (
                <button
                  key={p.id}
                  onClick={() => go(p.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    selectedIndex === index
                      ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                  )}
                  role="option"
                  aria-selected={selectedIndex === index}
                  >
                  <span className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-200 dark:border-gray-700">
                    <img
                      src={getProviderImage(p.id)}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium truncate text-gray-900 dark:text-gray-100">{p.name}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{p.subtitle}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {categoryHits.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800">
                Categories
              </div>
              {categoryHits.map((category, idx) => {
                const globalIndex = providerHits.length + idx;
                return (
                  <button
                    key={category.id}
                    onClick={() => go(category.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selectedIndex === globalIndex
                        ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                    )}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                  >
                    <span className="w-7 h-7 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <FolderOpen className="w-4 h-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium truncate text-gray-900 dark:text-gray-100">{category.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{category.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {userHits.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800">
                Users
              </div>
              {userHits.map((userHit, idx) => {
                const globalIndex = providerHits.length + categoryHits.length + idx;
                return (
                  <button
                    key={userHit.id}
                    onClick={() => go(userHit.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selectedIndex === globalIndex
                        ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                    )}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                  >
                    <span className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      <img
                        src={getProviderImage(userHit.id)}
                        alt={userHit.name}
                        className="w-full h-full object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium truncate text-gray-900 dark:text-gray-100">{userHit.name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{userHit.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pages, features, settings */}
          {indexMatches.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800">
                Pages &amp; Features
              </div>
              {indexMatches.map((item, idx) => {
                const globalIndex = providerHits.length + categoryHits.length + userHits.length + idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                      selectedIndex === globalIndex
                        ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                    )}
                    role="option"
                    aria-selected={selectedIndex === globalIndex}
                  >
                    <span className="w-7 h-7 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 flex-shrink-0 border border-gray-200 dark:border-gray-700">
                      {iconMap[item.icon]}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium truncate text-gray-900 dark:text-gray-100">{item.title}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</span>
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {item.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

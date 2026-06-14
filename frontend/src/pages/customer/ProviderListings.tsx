import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Briefcase, LayoutGrid, List, Clock, Brain, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useProviderStore } from '@/store/providerStore';
import { getProviderImage } from '@/utils/providerImages';
import { useCategories } from '@/hooks/useCategories';
import { aiService } from '@/services/aiService';
import { AdvancedSearch } from '@/components/search/AdvancedSearch';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { PageTransition } from '@/components/layout/PageTransition';
import { SearchIllustration } from '@/components/illustrations';
import { formatCurrency } from '@/utils';
import { cn } from '@/utils/cn';

export const ProviderListings: React.FC = () => {
  const {
    providers,
    total,
    page,
    totalPages,
    isLoading,
    filters,
    setFilters,
    fetchProviders,
  } = useProviderStore();

  const { categories } = useCategories();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [minRating, setMinRating] = useState(0);
  const [nlpQuery, setNlpQuery] = useState('');
  const [nlpResults, setNlpResults] = useState<{ id: string; name: string; category: string; specialization: string; location: string; rating: number; hourly_rate: number }[] | null>(null);
  const [nlpLoading, setNlpLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  const handleNlpSearch = async () => {
    if (!nlpQuery.trim()) { setNlpResults(null); return; }
    setNlpLoading(true);
    try {
      const data = await aiService.smartSearchProviders(nlpQuery);
      setNlpResults(data.results || []);
    } catch { setNlpResults([]); } finally { setNlpLoading(false); }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchProviders({
      search: filters.search || undefined,
      category_id: filters.category_id || undefined,
      location: filters.location || undefined,
      min_rating: minRating > 0 ? minRating : undefined,
      page: 1,
      size: 12,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced fetch when filters change (NOT on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
    fetchProviders({
      search: filters.search || undefined,
      category_id: filters.category_id || undefined,
      location: filters.location || undefined,
      min_rating: minRating > 0 ? minRating : undefined,
      page: 1,
      size: 12,
    });
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.category_id, filters.location, minRating]);

  const handleSearch = (query: string) => {
    setFilters({ search: query });
  };

  const handleCategorySelect = (categoryId: string) => {
    setFilters({ category_id: categoryId === filters.category_id ? '' : categoryId });
  };

  const handlePageChange = (pageNum: number) => {
    fetchProviders({
      search: filters.search || undefined,
      category_id: filters.category_id || undefined,
      location: filters.location || undefined,
      min_rating: minRating > 0 ? minRating : undefined,
      page: pageNum,
      size: 12,
    });
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    const node = categoryScrollRef.current;
    if (!node) return;
    node.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Find a Provider</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Browse and book appointments with service providers
            </p>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI #22: Smart NLP Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500" />
            <input
              type="text"
              value={nlpQuery}
              onChange={(e) => { setNlpQuery(e.target.value); if (!e.target.value) setNlpResults(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNlpSearch()}
              placeholder='AI Search: "yoga teacher in Pune on weekends"'
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-primary-300 dark:border-primary-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
          <button onClick={handleNlpSearch} disabled={nlpLoading || !nlpQuery.trim()}
            className="px-4 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2">
            {nlpLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
          {nlpResults && <button onClick={() => { setNlpResults(null); setNlpQuery(''); }} className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Clear</button>}
        </div>

        {/* NLP search results */}
        {nlpResults && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI found {nlpResults.length} result{nlpResults.length !== 1 ? 's' : ''} for "{nlpQuery}"</p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 uppercase tracking-wide">AI</span>
            </div>
            {nlpResults.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No providers matched your query. Try different keywords.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {nlpResults.map((p) => (
                  <Link key={p.id} to={`/providers/${p.id}`}>
                    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all dark:bg-gray-800 dark:border-gray-700 cursor-pointer border-primary-200 dark:border-primary-800">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} src={getProviderImage(p.id)} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                          <p className="text-xs text-primary-600 dark:text-primary-400">{p.specialization}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.rating.toFixed(1)}</span>
                        </div>
                        {p.hourly_rate && <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{formatCurrency(p.hourly_rate)}/hr</span>}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search + Inline Filters — Full Width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar — takes 2 columns on large screens */}
          <div className="sm:col-span-2 lg:col-span-2">
            <AdvancedSearch
              onSearch={handleSearch}
              className="w-full"
            />
          </div>
          {/* Category dropdown */}
          <select
            value={filters.category_id || ''}
            onChange={(e) => setFilters({ category_id: e.target.value })}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {/* Location dropdown */}
          <select
            value={filters.location || ''}
            onChange={(e) => setFilters({ location: e.target.value })}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="">All Locations</option>
            {['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Gurugram', 'Noida'].map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {/* Min Rating dropdown */}
          <select
            value={minRating.toString()}
            onChange={(e) => setMinRating(parseFloat(e.target.value))}
            className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            <option value="0">All Ratings</option>
            <option value="3">3+ Stars</option>
            <option value="3.5">3.5+ Stars</option>
            <option value="4">4+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
          </select>
        </div>

        {/* Category pills - horizontal scroll */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCategories('left')}
              className="shrink-0 w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Scroll categories left"
            >
              ‹
            </button>
            <div ref={categoryScrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setFilters({ category_id: '' })}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                  !filters.category_id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
                    filters.category_id === category.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => scrollCategories('right')}
              className="shrink-0 w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Scroll categories right"
            >
              ›
            </button>
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} provider{total !== 1 ? 's' : ''} found
          </p>

        {/* Provider grid/list */}
        {isLoading ? (
          <Skeleton variant="card" count={6} />
        ) : (() => {
          return providers.length === 0 ? (
          <EmptyState
            icon={<div className="w-36 h-36 text-primary-400 dark:text-primary-600 mx-auto"><SearchIllustration /></div>}
            title="No providers found"
            description="Try adjusting your search or filters to find what you're looking for"
          />
        ) : (
          <>
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'flex flex-col gap-3'
              )}
            >
              {providers.map((provider, index) => (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative"
                >
                  <Link to={`/providers/${provider.id}`}>
                    <Card
                      className={cn(
                        'h-full cursor-pointer dark:bg-gray-800 dark:border-gray-700',
                        'hover:shadow-lg hover:-translate-y-1 transition-all duration-200',
                        viewMode === 'list' && 'flex flex-row items-center gap-4'
                      )}
                    >
                      <div className={cn('flex items-start gap-4', viewMode === 'list' && 'flex-1')}>
                        <Avatar
                          name={provider.user?.full_name || 'Provider'}
                          src={getProviderImage(provider.id)}
                          size="xl"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {provider.user?.full_name || 'Provider'}
                          </h3>
                          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                            {provider.specialization}
                          </p>
                          {provider.category && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                              {provider.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={cn('mt-4 space-y-2', viewMode === 'list' && 'mt-0 hidden sm:block')}>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{provider.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Briefcase className="w-4 h-4 flex-shrink-0" />
                          <span>{provider.experience_years} years experience</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {provider.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500">
                            ({provider.total_reviews} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Available Today badge */}
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                          <Clock className="w-3 h-3" />
                          Available Today
                        </span>
                      </div>

                      {provider.hourly_rate && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(provider.hourly_rate)}
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/hr</span>
                          </p>
                        </div>
                      )}
                    </Card>
                  </Link>
                  {/* Favorite button positioned absolutely */}
                  <div className="absolute top-4 right-4">
                    <FavoriteButton providerId={provider.id} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        );
        })()}
      </div>
    </PageTransition>
  );
};

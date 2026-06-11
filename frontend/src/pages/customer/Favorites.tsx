import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Briefcase } from 'lucide-react';
import { favoriteService } from '@/services/favoriteService';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { HeartIllustration } from '@/components/illustrations';
import { formatCurrency } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { Provider } from '@/types';

export const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await favoriteService.getFavorites();
        setFavorites(data);
      } catch {
        // Error handled by interceptor
      } finally {
        setIsLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const handleRemove = (providerId: string) => {
    setFavorites((prev) => prev.filter((p) => p.id !== providerId));
  };

  return (
    <PageTransition>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Favorites</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Your saved providers for quick access
        </p>
      </div>

      {isLoading ? (
        <Skeleton variant="card" count={6} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<div className="w-28 h-28 text-primary-400 dark:text-primary-600 mx-auto"><HeartIllustration /></div>}
          title="No favorites yet"
          description="Browse providers and add them to your favorites for quick access"
          action={
            <Link to="/providers">
              <Button size="sm">Find Providers</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((provider) => (
            <div key={provider.id} className="relative">
              <Link to={`/providers/${provider.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-start gap-4">
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

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{provider.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Briefcase className="w-4 h-4" />
                      <span>{provider.experience_years} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {provider.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500">
                        ({provider.total_reviews} reviews)
                      </span>
                    </div>
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
              <div className="absolute top-4 right-4">
                <FavoriteButton
                  providerId={provider.id}
                  isFavorited={true}
                  onToggle={(isFav) => {
                    if (!isFav) handleRemove(provider.id);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
};

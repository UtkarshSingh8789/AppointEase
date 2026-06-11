import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Briefcase, Clock, ArrowLeft, DollarSign } from 'lucide-react';
import { useProviderStore } from '@/store/providerStore';
import { reviewService } from '@/services/reviewService';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Pagination } from '@/components/ui/Pagination';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { getProviderImage } from '@/utils/providerImages';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatCurrency } from '@/utils';
import { cn } from '@/utils/cn';
import type { Review } from '@/types';

export const ProviderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedProvider, isLoading, fetchProvider } = useProviderStore();

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProvider(id);
      loadReviews(id, 1);
    }
  }, [id, fetchProvider]);

  const loadReviews = async (providerId: string, page: number) => {
    setReviewsLoading(true);
    try {
      const data = await reviewService.getProviderReviews(providerId, { page, size: 5 });
      setReviews(data.reviews);
      setReviewsTotal(data.total);
      setReviewsPage(data.page);
      setReviewsTotalPages(data.total_pages);
    } catch {
      // Reviews might not be available
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewPageChange = (page: number) => {
    if (id) {
      loadReviews(id, page);
    }
  };

  if (isLoading || !selectedProvider) {
    return <LoadingSpinner size="lg" text="Loading provider details..." />;
  }

  const provider = selectedProvider;

  // Calculate rating distribution from reviews
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const maxRatingCount = Math.max(...ratingDistribution.map((r) => r.count), 1);

  return (
    <PageTransition>
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/providers"
        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to providers
      </Link>

      {/* Provider header with Book Appointment button */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar
            name={provider.user?.full_name || 'Provider'}
            src={getProviderImage(provider.id)}
            size="2xl"
          />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {provider.user?.full_name}
                  </h1>
                  <FavoriteButton providerId={provider.id} />
                </div>
                <p className="text-lg text-primary-600 dark:text-primary-400 font-medium mt-1">
                  {provider.specialization}
                </p>
              </div>
              <Link to={`/book/${provider.id}`}>
                <Button size="lg">Book Appointment</Button>
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 text-gray-400" />
                {provider.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Briefcase className="w-4 h-4 text-gray-400" />
                {provider.experience_years} years experience
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-medium">{provider.rating.toFixed(1)}</span>
                <span className="text-gray-400">({provider.total_reviews} reviews)</span>
              </div>
              {provider.hourly_rate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  {formatCurrency(provider.hourly_rate)}/hr
                </div>
              )}
            </div>

            {provider.is_verified && (
              <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                <Clock className="w-3 h-3" />
                Verified Provider
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* About section */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">About</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          {provider.profile_description || 'No description provided.'}
        </p>
      </Card>

      {/* Category */}
      {provider.category && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Service Category</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{provider.category.name}</p>
              {provider.category.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{provider.category.description}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Ratings & Reviews section */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ratings & Reviews</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {reviewsTotal} review{reviewsTotal !== 1 ? 's' : ''} from verified customers
            </p>
          </div>
        </div>

        {/* Rating summary */}
        <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          {/* Overall rating */}
          <div className="flex flex-col items-center justify-center sm:min-w-[120px]">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {provider.rating.toFixed(1)}
            </p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-4 h-4',
                    star <= Math.round(provider.rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {provider.total_reviews} total
            </p>
          </div>

          {/* Rating distribution bars */}
          <div className="flex-1 space-y-2">
            {ratingDistribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-4 text-right">
                  {star}
                </span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxRatingCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual reviews */}
        {reviewsLoading ? (
          <LoadingSpinner size="sm" />
        ) : reviews.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No reviews yet. Be the first to leave a review after your appointment.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
            {reviewsTotalPages > 1 && (
              <Pagination
                currentPage={reviewsPage}
                totalPages={reviewsTotalPages}
                onPageChange={handleReviewPageChange}
              />
            )}
          </div>
        )}
      </Card>
    </div>
    </PageTransition>
  );
};

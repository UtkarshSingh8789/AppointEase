import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  MapPin,
  Share2,
  Star,
} from 'lucide-react';
import { providerService } from '@/services/providerService';
import { reviewService } from '@/services/reviewService';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StarRating } from '@/components/ui/StarRating';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatCurrency } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import { cn } from '@/utils/cn';
import type { Provider, Review } from '@/types';

export const ProviderPublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews'>('about');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [providerData, reviewsData] = await Promise.all([
          providerService.getProvider(id),
          reviewService.getProviderReviews(id, { page: 1, size: 10 }),
        ]);
        setProvider(providerData);
        setReviews(reviewsData.reviews || []);
      } catch {
        // Error handled
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${provider?.user?.full_name} — AppointEase`,
          text: `Book an appointment with ${provider?.user?.full_name}`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading profile..." />;
  }

  if (!provider) {
    return (
      <PageTransition>
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">Provider not found</p>
          <Link to="/providers" className="text-primary-600 dark:text-primary-400 mt-2 inline-block">
            Browse providers
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back navigation */}
        <Link
          to="/providers"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to providers
        </Link>

        {/* Hero section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
            {/* Gradient banner */}
            <div className="h-32 bg-gradient-to-r from-primary-500 to-purple-600 -mx-6 -mt-6 mb-0" />

            <div className="relative px-6 pb-6">
              {/* Avatar overlapping banner */}
              <div className="-mt-16 mb-4 flex items-end justify-between">
                <div className="flex items-end gap-4">
                  <div className="ring-4 ring-white dark:ring-gray-800 rounded-full">
                    <Avatar
                      name={provider.user?.full_name || 'Provider'}
                      src={provider.id ? getProviderImage(provider.id) : undefined}
                      size="xl"
                    />
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {provider.user?.full_name}
                      </h1>
                      {provider.is_verified && (
                        <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                    <p className="text-primary-600 dark:text-primary-400 font-medium">
                      {provider.specialization}
                    </p>
                  </div>
                </div>

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {copied ? (
                    <>
                      <Copy className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share
                    </>
                  )}
                </button>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {provider.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rating</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {provider.total_reviews}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Reviews</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {provider.experience_years}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Years Exp.</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {provider.hourly_rate ? formatCurrency(provider.hourly_rate) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per Hour</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link to={`/book/${provider.id}`} className="flex-1">
                  <Button variant="gradient" size="lg" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('about')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'about'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'reviews'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Reviews ({provider.total_reviews})
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'about' ? (
          <motion.div
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Details */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                About
              </h3>
              {provider.profile_description ? (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {provider.profile_description}
                </p>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  No description provided yet.
                </p>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{provider.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{provider.experience_years} years of experience</span>
                </div>
                {provider.category && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>Category: {provider.category.name}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Badges */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Badges & Credentials
              </h3>
              <div className="flex flex-wrap gap-2">
                {provider.is_verified && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    Verified Provider
                  </span>
                )}
                {provider.experience_years >= 10 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    10+ Years Experience
                  </span>
                )}
                {provider.rating >= 4.5 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                    Top Rated
                  </span>
                )}
                {provider.total_reviews >= 50 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    Popular Choice
                  </span>
                )}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="reviews"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {reviews.length === 0 ? (
              <Card className="dark:bg-gray-800 dark:border-gray-700 text-center py-8">
                <Star className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No reviews yet</p>
              </Card>
            ) : (
              reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={review.customer?.full_name || 'Customer'}
                        size="sm"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {review.customer?.full_name || 'Anonymous'}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-1">
                          <StarRating value={review.rating} readonly size="sm" />
                        </div>
                        {review.comment && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

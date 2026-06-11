import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { formatDate } from '@/utils';
import { getProviderImage } from '@/utils/providerImages';
import type { Review } from '@/types';

interface ReviewCardProps {
  review: Review;
}

// AI Feature #6 helper — sentiment colour and label
function SentimentBadge({ sentiment }: { sentiment?: string | null }) {
  if (!sentiment) return null;
  const config: Record<string, { label: string; classes: string }> = {
    positive: { label: '😊 Positive', classes: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    neutral:  { label: '😐 Neutral',  classes: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
    negative: { label: '😞 Negative', classes: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  };
  const c = config[sentiment];
  if (!c) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.classes}`}>
      {c.label}
    </span>
  );
}

/** Displays a single review with customer info, rating, comment, and AI sentiment badge */
export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  // sentiment_topics is a JSON string from backend
  let topics: string[] = [];
  try {
    if (review.sentiment_topics) {
      topics = JSON.parse(review.sentiment_topics);
    }
  } catch {
    topics = [];
  }

  return (
    <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg">
      <div className="flex items-start gap-3">
        <Avatar
          name={review.customer?.full_name || 'Customer'}
          src={getProviderImage(review.customer?.id || 'customer')}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {review.customer?.full_name || 'Anonymous'}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* AI Feature #6: Sentiment badge */}
              <SentimentBadge sentiment={review.sentiment} />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(review.created_at)}
              </span>
            </div>
          </div>
          <div className="mt-1">
            <StarRating value={review.rating} readonly size="sm" />
          </div>
          {review.comment && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {review.comment}
            </p>
          )}
          {/* AI Feature #6: Topic tags */}
          {topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

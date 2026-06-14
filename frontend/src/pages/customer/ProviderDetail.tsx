import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Briefcase, Clock, ArrowLeft, DollarSign, Brain, ShieldCheck, MessageCircle, Send } from 'lucide-react';
import { useProviderStore } from '@/store/providerStore';
import { reviewService } from '@/services/reviewService';
import { aiService } from '@/services/aiService';
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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // AI states
  const [matchScore, setMatchScore] = useState<{ score: number; label: string; breakdown: Record<string, number> } | null>(null);
  const [trustScore, setTrustScore] = useState<{ trust_score: number; label: string; completion_rate: number } | null>(null);
  const [reviewSummary, setReviewSummary] = useState<{ summary: string; average_rating: number; total_reviews: number } | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqLoading, setFaqLoading] = useState(false);
  const [autoReplyMsg, setAutoReplyMsg] = useState('');
  const [autoReply, setAutoReply] = useState('');
  const [autoReplyLoading, setAutoReplyLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProvider(id);
      loadReviews(id, 1);
      // AI features — lazy load
      aiService.getProviderMatchScore(id).then(setMatchScore).catch(() => {});
      aiService.getProviderTrustScore(id).then(setTrustScore).catch(() => {});
      aiService.getReviewSummary(id).then((d) => d?.summary ? setReviewSummary(d) : null).catch(() => {});
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
    } catch { /* silent */ } finally {
      setReviewsLoading(false);
    }
  };

  const handleAskFaq = async () => {
    if (!id || !faqQuestion.trim()) return;
    setFaqLoading(true);
    try {
      const data = await aiService.askProviderQuestion(id, faqQuestion);
      setFaqAnswer(data.answer);
    } catch { setFaqAnswer('Unable to answer right now.'); } finally {
      setFaqLoading(false);
    }
  };

  const handleAutoReply = async () => {
    if (!id || !autoReplyMsg.trim()) return;
    setAutoReplyLoading(true);
    try {
      const data = await aiService.getAutoReply(id, autoReplyMsg);
      setAutoReply(data.reply);
    } catch { setAutoReply('Unable to generate reply.'); } finally {
      setAutoReplyLoading(false);
    }
  };

  if (isLoading || !selectedProvider) {
    return <LoadingSpinner size="lg" text="Loading provider details..." />;
  }

  const provider = selectedProvider;
  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));
  const maxRatingCount = Math.max(...ratingDistribution.map((r) => r.count), 1);

  return (
    <PageTransition>
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link to="/providers" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to providers
      </Link>

      {/* Provider header */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar name={provider.user?.full_name || 'Provider'} src={getProviderImage(provider.id)} size="2xl" />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{provider.user?.full_name}</h1>
                  <FavoriteButton providerId={provider.id} />
                </div>
                <p className="text-lg text-primary-600 dark:text-primary-400 font-medium mt-1">{provider.specialization}</p>
              </div>
              <Link to={`/book/${provider.id}`}><Button size="lg">Book Appointment</Button></Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="w-4 h-4 text-gray-400" />{provider.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Briefcase className="w-4 h-4 text-gray-400" />{provider.experience_years} years experience
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-medium">{provider.rating.toFixed(1)}</span>
                <span className="text-gray-400">({provider.total_reviews} reviews)</span>
              </div>
              {provider.hourly_rate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <DollarSign className="w-4 h-4 text-gray-400" />{formatCurrency(provider.hourly_rate)}/hr
                </div>
              )}
            </div>
            {provider.is_verified && (
              <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                <Clock className="w-3 h-3" />Verified Provider
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* AI #15 Match Score + AI #46 Trust Score */}
      {(matchScore || trustScore) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {matchScore && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-primary-200 dark:border-primary-800">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Match Score</span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 uppercase tracking-wide">AI</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">{matchScore.score}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ 100</span>
                <span className="ml-auto text-sm font-medium text-gray-700 dark:text-gray-300">{matchScore.label}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${matchScore.score}%` }} />
              </div>
            </Card>
          )}
          {trustScore && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Trust Score</span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 uppercase tracking-wide">AI</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-green-600 dark:text-green-400">{trustScore.trust_score}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">/ 100</span>
                <span className="ml-auto text-sm font-medium text-gray-700 dark:text-gray-300">{trustScore.label}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Completion rate: {trustScore.completion_rate}%</p>
            </Card>
          )}
        </div>
      )}

      {/* About */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">About</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{provider.profile_description || 'No description provided.'}</p>
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
              {provider.category.description && <p className="text-sm text-gray-500 dark:text-gray-400">{provider.category.description}</p>}
            </div>
          </div>
        </Card>
      )}

      {/* AI #24: FAQ Auto-Answer */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ask a Question</h2>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 uppercase tracking-wide">AI</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">e.g. "Do you offer home visits?" or "What documents should I bring?"</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={faqQuestion}
            onChange={(e) => setFaqQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskFaq()}
            placeholder="Type your question..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button size="sm" onClick={handleAskFaq} isLoading={faqLoading} disabled={!faqQuestion.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {faqAnswer && (
          <div className="mt-3 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-primary-800 dark:text-primary-200">{faqAnswer}</p>
          </div>
        )}
      </Card>

      {/* AI #38: Auto-Reply Simulator */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Provider is offline? Send a message</h2>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase tracking-wide">AI Auto-Reply</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={autoReplyMsg}
            onChange={(e) => setAutoReplyMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAutoReply()}
            placeholder="Leave a message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button size="sm" variant="secondary" onClick={handleAutoReply} isLoading={autoReplyLoading} disabled={!autoReplyMsg.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {autoReply && (
          <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">AI Auto-reply on behalf of provider:</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{autoReply}"</p>
          </div>
        )}
      </Card>

      {/* Ratings & Reviews */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ratings & Reviews</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{reviewsTotal} review{reviewsTotal !== 1 ? 's' : ''} from verified customers</p>
          </div>
        </div>

        {/* AI #23: Review Summary */}
        {reviewSummary?.summary && (
          <div className="mb-5 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">AI Review Summary</span>
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 uppercase tracking-wide">AI</span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{reviewSummary.summary}</div>
          </div>
        )}

        {/* Rating summary */}
        <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center sm:min-w-[120px]">
            <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{provider.rating.toFixed(1)}</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={cn('w-4 h-4', star <= Math.round(provider.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600')} />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{provider.total_reviews} total</p>
          </div>
          <div className="flex-1 space-y-2">
            {ratingDistribution.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-4 text-right">{star}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(count / maxRatingCount) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Individual reviews */}
        {reviewsLoading ? <LoadingSpinner size="sm" /> : reviews.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No reviews yet. Be the first to leave a review after your appointment.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            {reviewsTotalPages > 1 && <Pagination currentPage={reviewsPage} totalPages={reviewsTotalPages} onPageChange={(p) => id && loadReviews(id, p)} />}
          </div>
        )}
      </Card>
    </div>
    </PageTransition>
  );
};

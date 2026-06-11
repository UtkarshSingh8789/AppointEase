import React, { useState } from 'react';
import { Tag, Copy, CheckCircle, XCircle, Ticket, Clock, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageTransition } from '@/components/layout/PageTransition';
import { cn } from '@/utils/cn';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CouponResult {
  valid: boolean;
  discount_amount?: number;
  discount_percent?: number;
  original_amount?: number;
  final_amount?: number;
  message?: string;
}

interface PublicOffer {
  id: string;
  code: string;
  description: string;
  discount_percent: number;
  min_amount: number | null;
  max_discount: number | null;
  valid_until: string;
  terms: string;
}

// ─── Mock Available Offers ────────────────────────────────────────────────────

const AVAILABLE_OFFERS: PublicOffer[] = [
  {
    id: '1',
    code: 'WELCOME20',
    description: '20% off your first appointment',
    discount_percent: 20,
    min_amount: null,
    max_discount: 50,
    valid_until: '2025-12-31',
    terms: 'Valid for new users only. One-time use.',
  },
  {
    id: '2',
    code: 'SAVE10',
    description: '10% off any booking over $50',
    discount_percent: 10,
    min_amount: 50,
    max_discount: 30,
    valid_until: '2025-09-30',
    terms: 'Minimum order value $50. Cannot be combined with other offers.',
  },
  {
    id: '3',
    code: 'LOYALTY15',
    description: '15% off for returning customers',
    discount_percent: 15,
    min_amount: null,
    max_discount: 40,
    valid_until: '2025-10-15',
    terms: 'Must have at least 3 completed bookings. Single use per month.',
  },
  {
    id: '4',
    code: 'WEEKEND25',
    description: '25% off weekend appointments',
    discount_percent: 25,
    min_amount: 30,
    max_discount: 60,
    valid_until: '2025-08-31',
    terms: 'Valid for Saturday and Sunday bookings only.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ApplyCoupon: React.FC = () => {
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [result, setResult] = useState<CouponResult | null>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setIsApplying(true);
    setResult(null);

    try {
      const response = await api.post<CouponResult>('/coupons/apply', {
        code: couponCode.trim().toUpperCase(),
        amount: 100,
        category_id: null,
      });
      setResult(response.data);
      if (response.data.valid) {
        toast.success('Coupon applied successfully!');
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.detail || 'Invalid coupon code. Please try again.';
      setResult({ valid: false, message });
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast.success(`Code "${code}" copied to clipboard`);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Promo Codes & Offers
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Apply a coupon code or browse available offers
          </p>
        </div>

        {/* Apply Coupon Section */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Apply Coupon Code
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter promo code (e.g., WELCOME20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  leftIcon={<Ticket className="w-4 h-4" />}
                  aria-label="Coupon code"
                />
              </div>
              <Button
                onClick={handleApplyCoupon}
                isLoading={isApplying}
                disabled={!couponCode.trim()}
                className="sm:w-auto w-full"
              >
                Apply
              </Button>
            </div>

            {/* Result Animation */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  {result.valid ? (
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                            Coupon Applied Successfully!
                          </p>
                          <div className="mt-2 space-y-1">
                            {result.discount_percent && (
                              <p className="text-sm text-green-700 dark:text-green-400">
                                Discount: {result.discount_percent}% off
                              </p>
                            )}
                            {result.discount_amount != null && (
                              <p className="text-sm text-green-700 dark:text-green-400">
                                You save: ${result.discount_amount.toFixed(2)}
                              </p>
                            )}
                            {result.final_amount != null && (
                              <p className="text-base font-bold text-green-800 dark:text-green-200 mt-2">
                                Final Price: ${result.final_amount.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                            Invalid Coupon
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            {result.message || 'This coupon code is not valid or has expired.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Available Offers Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Available Offers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_OFFERS.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onCopy={handleCopyCode} />
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

// ─── Offer Card ───────────────────────────────────────────────────────────────

interface OfferCardProps {
  offer: PublicOffer;
  onCopy: (code: string) => void;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(offer.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = new Date(offer.valid_until) < new Date();

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:shadow-md',
        isExpired && 'opacity-60'
      )}
    >
      {/* Discount badge */}
      <div className="absolute top-0 right-0">
        <div className="bg-gradient-to-bl from-primary-500 to-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
          {offer.discount_percent}% OFF
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 pr-16">
          {offer.description}
        </p>

        {/* Code with copy button */}
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <code className="text-sm font-mono font-semibold text-primary-600 dark:text-primary-400">
              {offer.code}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={
              copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )
            }
            aria-label={`Copy code ${offer.code}`}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Valid until {new Date(offer.valid_until).toLocaleDateString()}
              {isExpired && (
                <span className="ml-1 text-red-500 font-medium">(Expired)</span>
              )}
            </span>
          </div>
          {offer.min_amount && (
            <p>Min. order: ${offer.min_amount}</p>
          )}
          {offer.max_discount && (
            <p>Max. discount: ${offer.max_discount}</p>
          )}
          <p className="text-gray-400 dark:text-gray-500 italic">{offer.terms}</p>
        </div>
      </div>
    </Card>
  );
};

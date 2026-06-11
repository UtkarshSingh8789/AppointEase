import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AxiosError } from 'axios';
import {
  Wallet as WalletIcon,
  Gift,
  TrendingUp,
  TrendingDown,
  Sparkles,
  History,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { loyaltyService } from '@/services/loyaltyService';
import type { LoyaltyAccount, LoyaltyTransaction } from '@/services/loyaltyService';
import { formatCurrency, formatDate } from '@/utils';
import { cn } from '@/utils/cn';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps a loyalty tier to a human-friendly label. */
function getTierLabel(tier: string): string {
  if (!tier) return 'Bronze';
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Customer wallet / loyalty points page.
 * Shows the current points balance, tier, and transaction history.
 */
export const Wallet: React.FC = () => {
  const { user } = useAuthStore();
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState(100);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);

  const loadWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      const accountData = await loyaltyService.getAccount();
      setAccount(accountData);
      setHasWallet(true);

      try {
        const txData = await loyaltyService.getTransactions({ page: 1, size: 20 });
        setTransactions(txData.transactions);
      } catch {
        // Transactions are non-critical; show the account even if they fail.
        setTransactions([]);
      }
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      if (status === 404) {
        setHasWallet(false);
        setAccount(null);
      } else {
        // Other errors are surfaced by the API interceptor.
        setHasWallet(true);
        setAccount(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTopUp = useCallback(async () => {
    const amount = Math.max(1, Math.floor(Number(topUpAmount || 0)));
    if (!amount) return;

    const RazorpayClass = (window as any).Razorpay;
    if (!RazorpayClass) {
      toast.error('Payment window is not available right now.');
      return;
    }

    setIsTopUpLoading(true);
    try {
      const orderRes = await api.post('/payments/create-order', {
        amount,
        notes: {
          purpose: 'wallet_topup',
          points: amount,
        },
      });

      const { order_id, key_id, amount: amountPaise, mock_mode } = orderRes.data;

      const verifyAndRefresh = async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const verifyRes = await api.post('/payments/verify', {
          ...response,
          purpose: 'wallet_topup',
          points: amount,
        });

        if (!verifyRes.data?.verified) {
          toast.error('Payment verification failed. Please try again.');
          return;
        }

        await loadWallet();
        toast.success(`Wallet topped up with ${amount} points`);
      };

      if (mock_mode) {
        await verifyAndRefresh({
          razorpay_order_id: order_id,
          razorpay_payment_id: `mock_payment_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        return;
      }

      const rzp = new RazorpayClass({
        key: key_id,
        amount: amountPaise,
        currency: 'INR',
        name: 'AppointEase',
        description: 'Wallet top-up',
        order_id,
        handler: verifyAndRefresh,
        modal: {
          ondismiss: () => toast('Payment window closed. Wallet was not updated.'),
        },
        prefill: {
          name: user?.full_name || '',
          email: user?.email || '',
          contact: user?.phone_number || '',
        },
        theme: { color: '#000000' },
      });

      rzp.open();
    } catch {
      toast.error('Unable to start wallet top-up right now.');
    } finally {
      setIsTopUpLoading(false);
    }
  }, [loadWallet, topUpAmount, user?.email, user?.full_name, user?.phone_number]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const balance = account?.points ?? 0;

  if (isLoading) {
    return (
      <PageTransition>
        <LoadingSpinner size="lg" text="Loading your wallet..." />
      </PageTransition>
    );
  }

  if (!hasWallet || !account) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Wallet</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Earn points on every booking and redeem them for discounts
            </p>
          </div>
          <Card>
            <EmptyState
              icon={<WalletIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
              title="No wallet yet"
              description="You don't have a loyalty wallet yet. Complete a booking to start earning points."
            />
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Wallet</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Earn points on every booking and redeem them for discounts
          </p>
        </motion.div>

        {/* Hero balance card */}
        <motion.div variants={itemVariants}>
          <Card className="border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <WalletIcon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium uppercase tracking-wide">
                    Points balance
                  </span>
                </div>
                <p className="mt-3 text-5xl font-bold text-gray-900 dark:text-gray-100">
                  {balance.toLocaleString('en-IN')}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>1 point = ₹1 off your next booking</span>
                </div>
              </div>

              {/* Tier chip */}
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Your tier
                </span>
                <span
                  className="inline-flex items-center gap-1.5 border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100"
                >
                  <Gift className="w-4 h-4" aria-hidden="true" />
                  {getTierLabel(account.tier)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatCurrency(balance)} available
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Redeem on booking
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Points are applied while confirming an appointment, so there is no separate redeem control on this page.
            </p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Top up wallet
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
              <Input
                label="Amount to add"
                type="number"
                min={1}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Math.max(1, Math.floor(Number(e.target.value || 0))))}
                helperText="You will receive the same number of wallet points after successful payment."
              />
              <div className="flex items-end">
                <Button
                  onClick={handleTopUp}
                  isLoading={isTopUpLoading}
                  className="w-full sm:w-auto"
                >
                  Add Funds
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Transaction history */}
        <motion.div variants={itemVariants}>
          <div className="mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Transaction history
            </h2>
          </div>

          {transactions.length === 0 ? (
            <Card className="border-gray-200 dark:border-gray-800">
              <EmptyState
                icon={<History className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
                title="No transactions yet"
                description="Your earned and redeemed points will appear here."
              />
            </Card>
          ) : (
            <Card className="border-gray-200 dark:border-gray-800" padding={false}>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {transactions.map((tx) => {
                  const isPositive = tx.points >= 0;
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'flex h-9 w-9 flex-shrink-0 items-center justify-center border',
                            'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                          )}
                          aria-hidden="true"
                        >
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {tx.description || (isPositive ? 'Points earned' : 'Points redeemed')}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {isPositive ? '+' : ''}
                          {tx.points.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isPositive ? 'earned' : 'redeemed'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </motion.div>
      </motion.div>

    </PageTransition>
  );
};

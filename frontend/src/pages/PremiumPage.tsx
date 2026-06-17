import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Star, Sparkles, Zap } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export const PremiumPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async (plan: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await api.post('/premium/subscribe', { plan });

      if (response.status >= 200 && response.status < 300) {
        // Refresh the page or update state to reflect premium status
        window.location.reload();
      }
    } catch (error) {
      console.error('Subscription failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium text-sm mb-4"
          >
            <Sparkles className="w-4 h-4" />
            AppointEase Premium
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Unlock the Full Potential
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Get exclusive AI features, advanced analytics, and priority support.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Standard Plan */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Standard</h3>
              <p className="text-gray-500 dark:text-gray-400">Everything you need to get started.</p>
            </div>
            <div className="mb-8">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">Free</span>
            </div>
            <ul className="space-y-4 mb-8">
              {['Basic AI Chatbot', 'Standard Search', 'Standard Support', 'Basic Profile'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            >
              Current Plan
            </button>
          </motion.div>

          {/* Premium Plan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-8 shadow-xl relative overflow-hidden text-white"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Star className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Premium</h3>
                <p className="text-primary-100">For power users and professionals.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold">₹999</span>
                <span className="text-primary-100">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  'Advanced AI Smart Slot Recommendation',
                  'Predictive Booking Intent',
                  'Advanced Analytics & Forecasting',
                  'Priority Booking & Support',
                  'Fraud Alerts & Churn Prediction (Admin)',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary-200 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe('premium')}
                disabled={isProcessing || user?.is_premium}
                className="w-full py-3 px-4 rounded-xl font-semibold bg-white text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? 'Processing...' : user?.is_premium ? 'Active' : 'Upgrade to Premium'}
                {!isProcessing && !user?.is_premium && <Zap className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

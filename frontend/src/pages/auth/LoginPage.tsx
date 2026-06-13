import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Calendar, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import type { UserRole } from '@/types';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Auto-focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (!error) return;

    const errorMessages: Record<string, string> = {
      oauth_failed: 'Google sign-in failed. Please try again.',
      microsoft_not_configured: 'Microsoft sign-in is not configured right now.',
      no_email: 'Your Google account did not return an email address.',
    };

    toast.error(errorMessages[error] || 'Social sign-in failed.');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const loggedInUser = await login(data);
      const dashboardPaths: Record<UserRole, string> = {
        customer: '/dashboard',
        provider: '/provider/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(dashboardPaths[loggedInUser.role], { replace: true });
    } catch {
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 600);
    }
  };

  const { ref: emailRegRef, ...emailRegProps } = register('email');

  return (
    <div className="min-h-screen flex">
      {/* Left side - monochrome editorial branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gray-900 dark:bg-gray-950">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <div className="max-w-md text-white">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-12 h-12 bg-white text-gray-900 flex items-center justify-center rounded-lg">
                <Calendar className="w-7 h-7" />
              </span>
              <h1 className="text-3xl font-bold text-white">AppointEase</h1>
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-white">
              Scheduling made simple
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-8">
              Book appointments with top service providers in your area.
              Manage your schedule effortlessly with our intuitive platform.
            </p>

            {/* Social proof */}
            <div className="flex items-center gap-3 p-4 border border-white/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-gray-200 font-medium">
                10,000+ appointments booked by happy customers
              </p>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-bold text-white">250k+</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Booked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">4.9★</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Rating</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">60+</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Categories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Calendar className="w-8 h-8 text-gray-900 dark:text-white" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AppointEase</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome back</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in to your account to continue</p>

          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            animate={shakeForm ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...emailRegProps}
              ref={(e) => {
                emailRegRef(e);
                (emailRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
              }}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </motion.form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                or continue with
              </span>
            </div>
          </div>

          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const { data } = await api.get('/auth/google/url');
                  if (data.url) window.location.href = data.url;
                } catch {
                  toast.error('Google sign-in is not configured right now.');
                }
              }}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600',
                'text-sm font-medium text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              )}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const { data } = await api.get('/auth/microsoft/url');
                  if (data.url) window.location.href = data.url;
                } catch {
                  toast.error('Microsoft sign-in is not configured right now.');
                }
              }}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600',
                'text-sm font-medium text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              )}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
              </svg>
              Microsoft
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

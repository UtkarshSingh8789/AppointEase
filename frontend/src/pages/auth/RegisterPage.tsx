import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, Calendar } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { UserRole } from '@/types';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => /[a-z]/.test(value), 'Password must include at least one lowercase letter')
    .refine((value) => /[A-Z]/.test(value), 'Password must include at least one uppercase letter')
    .refine((value) => /\d/.test(value), 'Password must include at least one number')
    .refine((value) => /[^A-Za-z0-9]/.test(value), 'Password must include at least one special character'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
  phone_number: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal('')),
  role: z.enum(['customer', 'provider'], { required_error: 'Please select a role' }),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'customer',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirm_password, ...payload } = data;
      const registeredUser = await registerUser(payload);
      const dashboardPaths: Record<UserRole, string> = {
        customer: '/dashboard',
        provider: '/provider/onboarding',
        admin: '/admin/dashboard',
      };
      // Force full page navigation — replace + reload fallback
      const target = dashboardPaths[registeredUser.role];
      window.location.href = target;
      setTimeout(() => { window.location.reload(); }, 100);
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 dark:bg-gray-950 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <span className="w-12 h-12 bg-white text-gray-900 flex items-center justify-center rounded-lg">
              <Calendar className="w-7 h-7" />
            </span>
            <h1 className="text-3xl font-bold text-white">AppointEase</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4 text-white">
            Join our platform
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Whether you&apos;re looking to book services or offer them, 
            AppointEase makes scheduling seamless for everyone.
          </p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Calendar className="w-8 h-8 text-gray-900 dark:text-white" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AppointEase</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create your account</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Get started with AppointEase today</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.full_name?.message}
              {...register('full_name')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            <Input
              label="Phone Number (optional)"
              type="tel"
              placeholder="9876543210"
              maxLength={10}
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone_number?.message}
              {...register('phone_number')}
            />

            <Select
              label="I want to"
              options={[
                { value: 'customer', label: 'Book appointments (Customer)' },
                { value: 'provider', label: 'Offer services (Provider)' },
              ]}
              error={errors.role?.message}
              {...register('role')}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

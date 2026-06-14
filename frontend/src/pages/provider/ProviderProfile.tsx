import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Sparkles } from 'lucide-react';
import { providerService } from '@/services/providerService';
import { aiService } from '@/services/aiService';
import { useCategories } from '@/hooks/useCategories';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageTransition } from '@/components/layout/PageTransition';
import type { Provider } from '@/types';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  specialization: z.string().min(2, 'Specialization is required'),
  category_id: z.string().min(1, 'Category is required'),
  experience_years: z.coerce.number().min(0, 'Must be 0 or more'),
  location: z.string().min(2, 'Location is required'),
  area: z.string().optional(),
  pincode: z.string().optional(),
  profile_description: z.string().optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProviderProfile: React.FC = () => {
  const { categories } = useCategories();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bioGenerating, setBioGenerating] = useState(false);
  const [suggestedBio, setSuggestedBio] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const currentSpecialization = watch('specialization');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await providerService.getMyProfile();
        setProvider(profile);
        reset({
          specialization: profile.specialization,
          category_id: profile.category_id,
          experience_years: profile.experience_years,
          location: profile.location,
          area: profile.area || '',
          pincode: profile.pincode || '',
          profile_description: profile.profile_description || '',
          hourly_rate: profile.hourly_rate || undefined,
        });
      } catch {
        // Provider might not be registered yet
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const updated = await providerService.updateProfile({
        specialization: data.specialization,
        category_id: data.category_id,
        experience_years: data.experience_years,
        location: data.location,
        area: data.area,
        pincode: data.pincode,
        profile_description: data.profile_description,
        hourly_rate: data.hourly_rate,
      });
      setProvider(updated);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // AI #18: Bio Generator
  const handleGenerateBio = async () => {
    if (!currentSpecialization) { toast.error('Fill in specialization first'); return; }
    setBioGenerating(true);
    try {
      // Use the suggest-category endpoint context to build a prompt; call FAQ endpoint for bio
      const specText = `${currentSpecialization}${provider ? `, ${provider.experience_years} years experience, ${provider.location}` : ''}`;
      // We leverage the classify cancellation endpoint as a generic Gemini proxy isn't exposed,
      // so we call the provider FAQ endpoint on our own provider id if available, else show a template
      if (provider?.id) {
        const data = await aiService.askProviderQuestion(
          provider.id,
          `Write a professional, SEO-friendly 3-sentence bio for a ${specText} service provider. Make it warm, credible, and highlight expertise.`
        );
        setSuggestedBio(data.answer || '');
      } else {
        setSuggestedBio(`${currentSpecialization} specialist with proven expertise and a patient-first approach. Committed to delivering high-quality, personalised service to every client. Book a session today to experience the difference.`);
      }
    } catch {
      toast.error('Failed to generate bio');
    } finally {
      setBioGenerating(false);
    }
  };

  const handleAcceptBio = () => {
    setValue('profile_description', suggestedBio);
    setSuggestedBio('');
    toast.success('Bio applied — remember to save your profile');
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  if (isLoading) return <LoadingSpinner size="lg" text="Loading profile..." />;

  return (
    <PageTransition>
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Provider Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your professional profile and services</p>
      </div>

      {provider && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Rating</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {provider.rating.toFixed(1)} ({provider.total_reviews} reviews)
              </p>
            </div>
            {provider.is_verified && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">Verified</span>
            )}
          </div>
        </Card>
      )}

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Specialization" placeholder="e.g., General Dentistry, Hair Styling" error={errors.specialization?.message} {...register('specialization')} />

          <Select label="Service Category" options={categoryOptions} placeholder="Select a category" error={errors.category_id?.message} {...register('category_id')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Years of Experience" type="number" min={0} error={errors.experience_years?.message} {...register('experience_years')} />
            <Input label="Hourly Rate (₹)" type="number" min={0} step={0.01} placeholder="0.00" error={errors.hourly_rate?.message} {...register('hourly_rate')} />
          </div>

          <Input label="Location" placeholder="City, State" error={errors.location?.message} {...register('location')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Area" placeholder="Local area" error={errors.area?.message} {...register('area')} />
            <Input label="Pincode" placeholder="Postal code" error={errors.pincode?.message} {...register('pincode')} />
          </div>

          {/* AI #18: Bio Generator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Description</label>
              <Button type="button" size="sm" variant="secondary" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={handleGenerateBio} isLoading={bioGenerating}>
                Improve with AI
              </Button>
            </div>
            <TextArea
              placeholder="Tell customers about your services, experience, and what makes you unique..."
              error={errors.profile_description?.message}
              rows={4}
              {...register('profile_description')}
            />
            {/* AI suggested bio diff */}
            {suggestedBio && (
              <div className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/10 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wide">AI Generated Bio</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{suggestedBio}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={handleAcceptBio}>Accept</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setSuggestedBio('')}>Dismiss</Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
    </PageTransition>
  );
};

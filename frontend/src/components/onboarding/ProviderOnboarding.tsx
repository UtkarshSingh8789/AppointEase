import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle,
  DollarSign,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { providerService } from '@/services/providerService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

// ── Category-specific license/document options ────────────────────────
const CATEGORY_DOCUMENTS: Record<string, string[]> = {
  default: ['Work Experience Certificate', 'Professional Portfolio', 'Reference Letter'],
  Medical: ['Medical Council Registration', 'MBBS Degree', 'MD/MS Degree', 'Specialization Certificate', 'Hospital Affiliation Letter'],
  Dental: ['Dental Council Registration', 'BDS/MDS Degree', 'Specialization Certificate'],
  Dermatology: ['Medical Council Registration', 'Dermatology Specialization Certificate', 'MD Dermatology Degree'],
  Legal: ['Bar Council Enrollment Certificate', 'LLB/LLM Degree', 'Practice Certificate', 'Chamber Registration'],
  Education: ['Teaching Certificate', 'Degree/Post-Graduate Certificate', 'School/College Affiliation Letter', 'CTET/STET Certificate'],
  'Yoga & Wellness': ['Yoga Certification (RYT-200/500)', 'Fitness Trainer Certificate', 'Ayurveda Practitioner License'],
  'Beauty & Salon': ['Cosmetology Certificate', 'Beauty Therapy Diploma', 'CIDESCO/CIBTAC Certificate'],
  Fitness: ['Personal Trainer Certification', 'ACSM/ACE Certificate', 'Gym Instructor License'],
  'Interior Design': ['Architecture/Interior Design Degree', 'Professional Membership Card', 'Portfolio'],
  Finance: ['CA/CPA Certificate', 'CFA Charter', 'SEBI Registration', 'Financial Planner Certificate'],
};

const IDENTITY_DOCUMENT_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'Voter ID',
  'Others',
];

interface DocumentEntry {
  type: string;       // selected from dropdown
  customName: string; // used when type === 'Others'
  file: File | null;
}

interface OnboardingData {
  specialization: string;
  category_id: string;
  experience_years: number;
  location: string;
  area: string;
  pincode: string;
  profile_description: string;
  hourly_rate: number;
}

const STEPS = [
  { label: 'Profile', icon: User },
  { label: 'Services', icon: Briefcase },
  { label: 'Documents', icon: DollarSign },
  { label: 'Preview', icon: Sparkles },
];

const emptyDoc = (): DocumentEntry => ({ type: '', customName: '', file: null });

/** Multi-step onboarding wizard for new providers */
export const ProviderOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');

  // New structured document state
  const [licenseEntries, setLicenseEntries] = useState<DocumentEntry[]>([emptyDoc()]);
  const [identityEntries, setIdentityEntries] = useState<DocumentEntry[]>([emptyDoc()]);

  const [data, setData] = useState<OnboardingData>({
    specialization: '',
    category_id: '',
    experience_years: 1,
    location: '',
    area: '',
    pincode: '',
    profile_description: '',
    hourly_rate: 500,
  });

  const updateData = (field: keyof OnboardingData, value: string | number) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Derive document type options from selected category
  const categoryName = categories.find((c) => c.id === data.category_id)?.name || '';
  const licenseOptions =
    CATEGORY_DOCUMENTS[categoryName] ||
    CATEGORY_DOCUMENTS[
      Object.keys(CATEGORY_DOCUMENTS).find((key) =>
        categoryName.toLowerCase().includes(key.toLowerCase())
      ) || 'default'
    ] ||
    CATEGORY_DOCUMENTS.default;

  const updateLicense = (idx: number, field: keyof DocumentEntry, value: string | File | null) => {
    setLicenseEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const updateIdentity = (idx: number, field: keyof DocumentEntry, value: string | File | null) => {
    setIdentityEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  // Collect all attached files for form submission
  const allDocumentFiles = (): File[] => {
    const files: File[] = [];
    for (const entry of [...licenseEntries, ...identityEntries]) {
      if (entry.file) files.push(entry.file);
    }
    return files;
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return Boolean(data.category_id && data.location && data.pincode);
      case 1:
        return Boolean(data.specialization && data.experience_years > 0 && data.hourly_rate > 0);
      case 2: {
        const hasLicense = licenseEntries.some((e) => e.file !== null);
        const hasIdentity = identityEntries.some((e) => e.file !== null);
        return hasLicense && hasIdentity;
      }
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : '');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    const supportFiles = allDocumentFiles();
    try {
      if (!data.category_id) {
        toast.error('Please select a service category.');
        setIsSubmitting(false);
        return;
      }
      if (supportFiles.length === 0) {
        toast.error('Please upload at least one certificate, license, or supporting document.');
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('specialization', data.specialization);
      formData.append('category_id', data.category_id);
      formData.append('experience_years', String(data.experience_years));
      formData.append('location', data.location);
      if (data.area.trim()) formData.append('area', data.area.trim());
      if (data.pincode.trim()) formData.append('pincode', data.pincode.trim());
      if (data.profile_description.trim()) formData.append('profile_description', data.profile_description.trim());
      formData.append('hourly_rate', String(data.hourly_rate));
      if (avatarFile) formData.append('avatar_file', avatarFile);
      supportFiles.forEach((file) => formData.append('documents', file));

      await providerService.registerApplication(formData);
      setIsComplete(true);
      toast.success('Your provider application has been submitted!');
      setTimeout(() => navigate('/provider/pending'), 1800);
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string | string[] | Array<{ msg?: string; loc?: (string | number)[] }> } };
      };
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        const first = detail[0];
        const msg = typeof first === 'string' ? first : `${Array.isArray((first as { loc?: unknown[] }).loc) ? (first as { loc: (string | number)[] }).loc.join('.') : 'field'}: ${(first as { msg?: string }).msg || 'validation error'}`;
        setSubmitError(msg);
        toast.error(msg);
      } else if (typeof detail === 'string') {
        setSubmitError(detail);
        toast.error(detail);
      } else {
        setSubmitError('Failed to submit your application. Please try again.');
        toast.error('Failed to submit your application. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Completion animation
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2"
        >
          You&apos;re all set!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-gray-500 dark:text-gray-400"
        >
          Your provider profile has been submitted and is waiting for admin approval.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Set Up Your Provider Profile
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Complete these steps to start receiving bookings
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.label} className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-primary-600 text-white',
                    isActive && 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-2 ring-primary-600 dark:ring-primary-400',
                    !isActive && !isCompleted && 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Progress line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-700 -z-0">
          <motion.div
            className="h-full bg-primary-600"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            {submitError && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                {submitError}
              </div>
            )}
            {currentStep === 0 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Tell us about yourself
                </h3>
                <Select
                  label="Service Category"
                  value={data.category_id}
                  onChange={(e) => updateData('category_id', e.target.value)}
                  options={[
                    { value: '', label: 'Select a category...' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
                <Input
                  label="Location"
                  placeholder="e.g., Mumbai, Delhi, Bangalore"
                  value={data.location}
                  onChange={(e) => updateData('location', e.target.value)}
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Area"
                    placeholder="e.g., Bandra West"
                    value={data.area}
                    onChange={(e) => updateData('area', e.target.value)}
                  />
                  <Input
                    label="Pincode"
                    placeholder="e.g., 400050"
                    value={data.pincode}
                    onChange={(e) => updateData('pincode', e.target.value)}
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-black file:text-white dark:file:bg-white dark:file:text-black hover:file:opacity-90"
                    />
                  </div>
                </div>
                <TextArea
                  label="About You (optional)"
                  placeholder="Tell potential clients about your experience and approach..."
                  value={data.profile_description}
                  onChange={(e) => updateData('profile_description', e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Your services
                </h3>
                <Input
                  label="Specialization"
                  placeholder="e.g., Dermatologist, Hair Stylist, Yoga Instructor"
                  value={data.specialization}
                  onChange={(e) => updateData('specialization', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Years of Experience
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={data.experience_years}
                      onChange={(e) => updateData('experience_years', parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[3ch] text-right">
                      {data.experience_years}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {data.experience_years} year{data.experience_years > 1 ? 's' : ''} of professional experience
                  </p>
                </div>
                {/* Hourly rate moved here so step 2 is complete before documents */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hourly Rate (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      value={data.hourly_rate}
                      onChange={(e) => updateData('hourly_rate', Math.max(100, parseInt(e.target.value) || 100))}
                      className="w-full pl-8 pr-16 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-lg font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    💡 Similar providers in your area charge ₹500–₹2,000/hr
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Upload your supporting documents
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
                  Select the document type from the dropdown, then upload the file.
                  Add as many as needed. Both a license/certificate and a proof of identity are required.
                </p>

                {/* ── Licenses / Certificates ─────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Licenses &amp; Certificates
                      <span className="ml-1 text-red-500">*</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setLicenseEntries((prev) => [...prev, emptyDoc()])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add another
                    </button>
                  </div>

                  {licenseEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={entry.type}
                          onChange={(e) => updateLicense(idx, 'type', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        >
                          <option value="">Select document type…</option>
                          {licenseOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          <option value="Others">Others (specify below)</option>
                        </select>
                        {licenseEntries.length > 1 && (
                          <button
                            type="button"
                            aria-label="Remove this document"
                            onClick={() => setLicenseEntries((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {entry.type === 'Others' && (
                        <input
                          type="text"
                          placeholder="Enter document name"
                          value={entry.customName}
                          onChange={(e) => updateLicense(idx, 'customName', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                      )}

                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                        onChange={(e) => updateLicense(idx, 'file', e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50"
                      />
                      {entry.file && (
                        <p className="text-xs text-green-600 dark:text-green-400 truncate">
                          ✓ {entry.file.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Proof of Identity ────────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Proof of Identity
                      <span className="ml-1 text-red-500">*</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setIdentityEntries((prev) => [...prev, emptyDoc()])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add another
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                    Upload a government-issued photo ID. This is kept confidential and used only for verification.
                  </p>

                  {identityEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <select
                          value={entry.type}
                          onChange={(e) => updateIdentity(idx, 'type', e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        >
                          <option value="">Select ID type…</option>
                          {IDENTITY_DOCUMENT_TYPES.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        {identityEntries.length > 1 && (
                          <button
                            type="button"
                            aria-label="Remove this ID"
                            onClick={() => setIdentityEntries((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {entry.type === 'Others' && (
                        <input
                          type="text"
                          placeholder="Enter document name"
                          value={entry.customName}
                          onChange={(e) => updateIdentity(idx, 'customName', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        />
                      )}

                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => updateIdentity(idx, 'file', e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50"
                      />
                      {entry.file && (
                        <p className="text-xs text-green-600 dark:text-green-400 truncate">
                          ✓ {entry.file.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Validation hint */}
                {!canProceed() && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Please upload at least one license/certificate and one proof of identity to continue.
                  </p>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Review your profile
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Specialization</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.specialization}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Category</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {categories.find((c) => c.id === data.category_id)?.name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Location</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Area</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.area || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Pincode</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.pincode}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Experience</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.experience_years} years</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Hourly Rate</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">₹{data.hourly_rate}/hr</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-500 dark:text-gray-400">Application status</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Pending admin approval</span>
                  </div>
                  {allDocumentFiles().length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Uploaded documents</p>
                      <ul className="space-y-1 text-sm text-gray-900 dark:text-gray-100">
                        {[...licenseEntries, ...identityEntries]
                          .filter((e) => e.file)
                          .map((e, idx) => (
                            <li key={idx} className="truncate">
                              {e.type === 'Others' ? e.customName || 'Others' : e.type}: {e.file!.name}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {data.profile_description && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">About</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{data.profile_description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={currentStep === 0}
          className={cn(currentStep === 0 && 'invisible')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            variant="gradient"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!canProceed()}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Create Profile
          </Button>
        )}
      </div>

      {/* Skip option */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        You can always update these details later from your profile settings.
      </p>
    </div>
  );
};

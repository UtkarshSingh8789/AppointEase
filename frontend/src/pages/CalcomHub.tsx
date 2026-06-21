import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Link as LinkIcon,
  Sparkles,
  Star,
  ShieldCheck,
  Users,
  Video,
  Clock3,
  TrendingUp,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageTransition } from '@/components/layout/PageTransition';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';

type FeatureStatus = 'live' | 'partial' | 'planned';

interface CatalogFeature {
  id: string;
  number: number;
  title: string;
  category: string;
  status: FeatureStatus;
  summary: string;
  route?: string | null;
  premium_only: boolean;
}

interface CatalogCategory {
  name: string;
  features: CatalogFeature[];
}

interface CatalogSummary {
  total: number;
  live: number;
  partial: number;
  planned: number;
  premium_locked: number;
}

interface CatalogResponse {
  summary: CatalogSummary;
  categories: CatalogCategory[];
  features: CatalogFeature[];
}

interface ProviderSnapshot {
  has_provider_profile: boolean;
  booking_link?: string | null;
  public_profile_link?: string | null;
  provider?: {
    id: string;
    name: string;
    category?: string | null;
    specialization: string;
    verified: boolean;
    hourly_rate?: number | null;
    location: string;
    booking_link: string;
    public_profile_link: string;
    profile_link: string;
  };
  integrations: { name: string; active: boolean; metadata?: unknown }[];
  upcoming_appointments: number;
  availability_templates: number;
  vacation_mode: boolean;
  vacation_window?: { start?: string | null; end?: string | null };
  next_slots: { date: string; start_time: string; end_time: string }[];
  premium_status: 'standard' | 'premium';
  premium_prompt: string;
}

const statusStyles: Record<FeatureStatus, string> = {
  live: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  planned: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

const statusLabels: Record<FeatureStatus, string> = {
  live: 'Live',
  partial: 'Partial',
  planned: 'Planned',
};

const categoryIcons: Record<string, React.ReactNode> = {
  'Booking Experience': <CalendarDays className="w-5 h-5" />,
  'Calendar and Meetings': <Video className="w-5 h-5" />,
  'Teams and Workflows': <Users className="w-5 h-5" />,
  'Customer Experience': <Sparkles className="w-5 h-5" />,
  'Provider Experience': <BarChart3 className="w-5 h-5" />,
};

const featureIcon = (feature: CatalogFeature) => {
  if (feature.status === 'live') return <CheckCircle2 className="w-4 h-4" />;
  if (feature.premium_only) return <ShieldCheck className="w-4 h-4" />;
  return <Star className="w-4 h-4" />;
};

const resolveRoute = (route?: string | null, providerId?: string | null) => {
  if (!route) return null;
  if (route.includes('{appointment_id}')) return null;
  if (route.includes('{provider_id}')) {
    return providerId ? route.replace('{provider_id}', providerId) : null;
  }
  return route.includes('{') ? null : route;
};

const formatFeatureLink = (route: string | null | undefined, providerId?: string | null) => {
  const resolved = resolveRoute(route, providerId);
  if (!resolved) return null;
  return resolved;
};

export const CalcomHub: React.FC = () => {
  const { user } = useAuthStore();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [snapshot, setSnapshot] = useState<ProviderSnapshot | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [catalogResponse, snapshotResponse] = await Promise.all([
          api.get<CatalogResponse>('/calcom/catalog'),
          user ? api.get<ProviderSnapshot>('/calcom/me/snapshot').catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setCatalog(catalogResponse.data);
        setSnapshot(snapshotResponse?.data ?? null);
      } catch (error) {
        console.error('Failed to load Cal.com hub', error);
        if (!cancelled) {
          setLoadError('Unable to load the Cal.com hub right now.');
        }
        if (!cancelled) {
          toast.error('Unable to load the Cal.com hub right now.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const categories = useMemo(() => ['All', ...(catalog?.categories.map((category) => category.name) ?? [])], [catalog]);

  const visibleCategories = useMemo(() => {
    if (!catalog) return [];
    return activeCategory === 'All'
      ? catalog.categories
      : catalog.categories.filter((category) => category.name === activeCategory);
  }, [activeCategory, catalog]);

  const bookingLink = snapshot?.booking_link ? `${window.location.origin}${snapshot.booking_link}` : null;
  const publicProfileLink = snapshot?.public_profile_link ? `${window.location.origin}${snapshot.public_profile_link}` : null;
  const resolvedBookingRoute = formatFeatureLink(snapshot?.booking_link, snapshot?.provider?.id);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <LoadingSpinner size="lg" text="Loading Cal.com hub..." />
      </div>
    );
  }

  if (loadError && !catalog) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
          <Card className="max-w-lg w-full text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cal.com hub unavailable</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{loadError}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Link to="/register">
                <Button variant="secondary">Create account</Button>
              </Link>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!catalog) {
    return null;
  }

  const summary = catalog.summary;
  const providerId = snapshot?.provider?.id || null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] border border-black/10 dark:border-white/10 bg-gradient-to-br from-black via-neutral-900 to-neutral-800 text-white shadow-2xl"
          >
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.2),_transparent_40%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.9fr] p-8 lg:p-12">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
                  <Sparkles className="w-4 h-4" />
                  Cal.com-inspired scheduling hub
                </div>
                <div className="space-y-4 max-w-2xl">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[0.92]">
                    Build booking flows like a product, not a calendar.
                  </h1>
                  <p className="text-base sm:text-lg text-white/70 max-w-2xl">
                    This hub turns the 50 Cal.com-inspired ideas into live product surfaces, with real routes, booking links,
                    premium gating, and provider snapshots wired into the platform.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/premium">
                    <Button variant="secondary" leftIcon={<Sparkles className="w-4 h-4" />}>
                      View Premium
                    </Button>
                  </Link>
                  <Link to="/providers">
                    <Button variant="outline" leftIcon={<CalendarDays className="w-4 h-4" />}>
                      Browse Providers
                    </Button>
                  </Link>
                  {user?.role === 'provider' && (
                    <Link to="/provider/availability">
                      <Button variant="outline" leftIcon={<Clock3 className="w-4 h-4" />}>
                        Manage Availability
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total features', value: summary.total, icon: <Sparkles className="w-4 h-4" /> },
                  { label: 'Live now', value: summary.live, icon: <CheckCircle2 className="w-4 h-4" /> },
                  { label: 'Premium locked', value: summary.premium_locked, icon: <ShieldCheck className="w-4 h-4" /> },
                  { label: 'Routes wired', value: catalog.features.filter((feature) => feature.route).length, icon: <LinkIcon className="w-4 h-4" /> },
                ].map((item) => (
                  <Card key={item.label} className="bg-white/10 border-white/10 text-white backdrop-blur-sm" padding>
                    <div className="flex items-center justify-between text-white/70 text-sm">
                      <span>{item.label}</span>
                      {item.icon}
                    </div>
                    <div className="mt-4 text-3xl font-bold tracking-tight">{item.value}</div>
                  </Card>
                ))}
              </div>
            </div>
          </motion.section>

          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Card className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live provider snapshot</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Shareable links, active integrations, and scheduling details for the logged-in provider.
                  </p>
                </div>
                {snapshot?.has_provider_profile ? (
                  <span className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em]',
                    snapshot.premium_status === 'premium'
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                  )}>
                    {snapshot.premium_status === 'premium' ? 'Premium active' : 'Standard plan'}
                  </span>
                ) : (
                  <Link to="/provider/onboarding">
                    <Button variant="secondary" size="sm" leftIcon={<ArrowRight className="w-4 h-4" />}>
                      Complete onboarding
                    </Button>
                  </Link>
                )}
              </div>

              {snapshot?.has_provider_profile ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card padding className="bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Booking link</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white break-all">{bookingLink}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => bookingLink && copyText(bookingLink, 'Booking link')} leftIcon={<Copy className="w-4 h-4" />}>
                        Copy
                      </Button>
                    </div>
                    {resolvedBookingRoute && (
                      <Link to={resolvedBookingRoute} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-black dark:text-white">
                        Open booking flow
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </Card>

                  <Card padding className="bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Public profile</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white break-all">{publicProfileLink}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => publicProfileLink && copyText(publicProfileLink, 'Public profile link')} leftIcon={<Copy className="w-4 h-4" />}>
                        Copy
                      </Button>
                    </div>
                    <Link to={snapshot?.provider?.profile_link || '/provider/profile'} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-black dark:text-white">
                      Open provider profile
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Card>

                  <Card padding className="bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Schedule state</p>
                    <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p>Upcoming appointments: <span className="font-semibold">{snapshot.upcoming_appointments}</span></p>
                      <p>Availability templates: <span className="font-semibold">{snapshot.availability_templates}</span></p>
                      <p>Vacation mode: <span className="font-semibold">{snapshot.vacation_mode ? 'On' : 'Off'}</span></p>
                    </div>
                  </Card>

                  <Card padding className="bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Integrations</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {snapshot.integrations.length > 0 ? snapshot.integrations.map((integration) => (
                        <span key={integration.name} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {integration.name}
                        </span>
                      )) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No integrations connected yet.</span>
                      )}
                    </div>
                  </Card>

                  <Card padding className="md:col-span-2 bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Next available slots</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{snapshot.premium_prompt}</p>
                      </div>
                      <Link to="/provider/availability">
                        <Button size="sm" variant="secondary" leftIcon={<Clock3 className="w-4 h-4" />}>
                          Edit availability
                        </Button>
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {snapshot.next_slots.length > 0 ? snapshot.next_slots.map((slot) => (
                        <span key={`${slot.date}-${slot.start_time}`} className="inline-flex items-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs font-semibold">
                          {slot.date} · {slot.start_time}-{slot.end_time}
                        </span>
                      )) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No open slots found in the next week.</span>
                      )}
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Provider profile not set up yet</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Finish onboarding to unlock booking links, integrations, availability templates, and premium scheduling tools.
                      </p>
                    </div>
                    <Link to="/provider/onboarding">
                      <Button variant="primary" leftIcon={<Sparkles className="w-4 h-4" />}>
                        Complete onboarding
                      </Button>
                    </Link>
                  </div>
                </Card>
              )}
            </Card>

            <Card className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature health</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Live, partial, and premium-locked counts from the roadmap.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Live', value: summary.live, tone: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Partial', value: summary.partial, tone: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Planned', value: summary.planned, tone: 'text-neutral-600 dark:text-neutral-400' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 p-4 text-center">
                    <div className={cn('text-2xl font-bold', item.tone)}>{item.value}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Jump to route</p>
                <div className="grid gap-3">
                  {[
                    { label: 'Premium pricing', path: '/premium' },
                    { label: 'Provider integrations', path: '/provider/integrations' },
                    { label: 'Availability manager', path: '/provider/availability' },
                    { label: 'Appointments timeline', path: '/appointments' },
                  ].map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:border-black dark:hover:border-white transition-colors"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ))}
                </div>
              </div>

              {bookingLink && (
                <div className="space-y-3 rounded-2xl border border-black/10 dark:border-white/10 bg-black text-white dark:bg-white dark:text-black p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/60 dark:text-black/60">Copyable booking url</p>
                      <p className="mt-1 text-sm font-medium break-all">{bookingLink}</p>
                    </div>
                    <button
                      onClick={() => copyText(bookingLink, 'Booking link')}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 dark:border-black/10 bg-white/10 dark:bg-black/10 px-3 py-2 text-sm font-medium"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  {snapshot?.provider?.booking_link && (
                    <div className="text-xs text-white/60 dark:text-black/60">Embedded route: {snapshot.provider.booking_link}</div>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-10">
            <div className="flex flex-wrap items-center gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    activeCategory === category
                      ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                      : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 border-neutral-200 dark:border-neutral-700 hover:border-black dark:hover:border-white'
                  )}
                >
                  {categoryIcons[category] || <Globe className="w-4 h-4" />}
                  {category}
                </button>
              ))}
            </div>

            {visibleCategories.map((category) => (
              <section key={category.name} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 text-black dark:text-white">
                      {categoryIcons[category.name] || <Globe className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category.name}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{category.features.length} feature(s) in this area</p>
                    </div>
                  </div>
                  {activeCategory !== 'All' && (
                    <Button size="sm" variant="ghost" onClick={() => setActiveCategory('All')}>
                      Show all
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {category.features.map((feature, index) => {
                    const resolvedRoute = formatFeatureLink(feature.route, providerId);

                    return (
                      <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                      >
                        <Card className="h-full flex flex-col justify-between hover:shadow-lg transition-shadow">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-neutral-100 dark:bg-neutral-800 p-3 text-black dark:text-white">
                                  {featureIcon(feature)}
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">#{feature.number}</p>
                                  <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                                </div>
                              </div>
                              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusStyles[feature.status])}>
                                {statusLabels[feature.status]}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-6">{feature.summary}</p>
                          </div>

                          <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {feature.premium_only && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                  Premium
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400">Open the real route or next-step flow</span>
                            </div>

                            {resolvedRoute ? (
                              <Link to={resolvedRoute}>
                                <Button size="sm" variant="secondary" rightIcon={<ExternalLink className="w-4 h-4" />}>
                                  Open
                                </Button>
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">Route preview only</span>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

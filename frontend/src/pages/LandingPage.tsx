import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  CalendarCheck,
  Zap,
  ShieldCheck,
  Star,
  Clock3,
  BarChart3,
  Search,
  CalendarDays,
  Check,
  ArrowRight,
  ArrowUpRight,
  Stethoscope,
  Scissors,
  Scale,
  GraduationCap,
  Home,
  Dumbbell,
  Wrench,
  Camera,
  Twitter,
  Linkedin,
  Instagram,
  type LucideIcon,
} from 'lucide-react';
import { LandingNavbar } from '@/components/layout/LandingNavbar';

/* ────────────────────────────────────────────────────────────
   useCounter — animates from 0 → end when the element scrolls
   into view. Uses requestAnimationFrame with an ease-out curve.
   ──────────────────────────────────────────────────────────── */
function useCounter(end: number, isInView: boolean, duration = 1800): number {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isInView || hasRun.current) return;
    hasRun.current = true;

    let frame: number;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic for a natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [end, isInView, duration]);

  return count;
}

/* ────────────────────────────────────────────────────────────
   Reveal — fade + slide-up wrapper driven by scroll position
   ──────────────────────────────────────────────────────────── */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

const Reveal: React.FC<RevealProps> = ({ children, className, delay = 0, y = 24 }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ────────────────────────────────────────────────────────────
   Counter — single animated metric, fires when scrolled in view
   ──────────────────────────────────────────────────────────── */
interface CounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  label: string;
  decimals?: number;
  light?: boolean;
}

const Counter: React.FC<CounterProps> = ({ end, prefix = '', suffix = '', label, decimals = 0, light = false }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const raw = useCounter(decimals > 0 ? end * Math.pow(10, decimals) : end, inView);
  const value = decimals > 0 ? (raw / Math.pow(10, decimals)).toFixed(decimals) : raw.toLocaleString();

  return (
    <div ref={ref} className="text-center">
      <p
        className={
          'text-4xl sm:text-5xl font-bold tracking-tight tabular-nums ' +
          (light ? 'text-white' : 'text-black dark:text-neutral-100')
        }
      >
        {prefix}
        {value}
        {suffix}
      </p>
      <p
        className={
          'mt-2 text-xs sm:text-sm uppercase tracking-[0.2em] ' +
          (light ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-400')
        }
      >
        {label}
      </p>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Static content
   ──────────────────────────────────────────────────────────── */
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: CalendarCheck,
    title: 'Smart Scheduling',
    description: 'Conflict-free booking that reads live availability and locks the right slot in a single tap.',
  },
  {
    icon: Zap,
    title: 'Instant Confirmations',
    description: 'No waiting, no callbacks. Every booking is confirmed the moment it is made, with reminders to match.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Payments',
    description: 'PCI-compliant processing with UPI, cards, and net banking. Money moves only when the work is done.',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Verified reviews from real appointments so customers choose with confidence, every time.',
  },
  {
    icon: Clock3,
    title: 'Real-time Availability',
    description: 'Calendars sync the instant a slot fills, across web and mobile, so double-bookings never happen.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track bookings, revenue, and retention with reporting that turns activity into decisions.',
  },
];

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Find',
    description: 'Search verified professionals by category, location, and availability. Filter until it fits.',
    icon: Search,
  },
  {
    number: '02',
    title: 'Book',
    description: 'Pick a real-time slot, confirm in seconds, and pay securely. The calendar handles the rest.',
    icon: CalendarDays,
  },
  {
    number: '03',
    title: 'Relax',
    description: 'Get instant confirmation and timely reminders. Show up, and let the appointment run on rails.',
    icon: CalendarCheck,
  },
];

interface CategoryItem {
  name: string;
  icon: LucideIcon;
}

const categories: CategoryItem[] = [
  { name: 'Healthcare', icon: Stethoscope },
  { name: 'Beauty', icon: Scissors },
  { name: 'Legal', icon: Scale },
  { name: 'Education', icon: GraduationCap },
  { name: 'Home Services', icon: Home },
  { name: 'Fitness', icon: Dumbbell },
  { name: 'Repairs', icon: Wrench },
  { name: 'Photography', icon: Camera },
];

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Priya Sharma',
    role: 'Customer, Delhi',
    rating: 5,
    quote:
      'Booking a doctor used to mean a dozen phone calls. Now it is three taps and a confirmation. AppointEase just works.',
  },
  {
    name: 'Dr. Rajesh Kumar',
    role: 'Dentist, Mumbai',
    rating: 5,
    quote:
      'No-shows dropped by nearly half after we switched. The automated reminders and clean schedule pay for themselves.',
  },
  {
    name: 'Anita Desai',
    role: 'Salon Owner, Bengaluru',
    rating: 5,
    quote:
      'The analytics tell me exactly when to staff up. My clients love how easy it is to book. Best decision for my business.',
  },
];

const customerPlanFeatures = [
  'Unlimited bookings',
  'Real-time availability',
  'SMS & email reminders',
  'Reviews & ratings',
  'Saved favorite providers',
  'Full booking history',
];

const providerPlanFeatures = [
  'Everything in Customer',
  'Custom availability rules',
  'Automated reminders',
  'Analytics dashboard',
  'Secure payouts',
  'Priority support',
  'Custom branding',
  'Multi-staff management',
];

const footerColumns: { heading: string; links: string[] }[] = [
  { heading: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Mobile App', 'Changelog'] },
  { heading: 'Company', links: ['About', 'Careers', 'Blog', 'Press', 'Contact'] },
  { heading: 'Resources', links: ['Help Center', 'Documentation', 'Guides', 'Community', 'Status'] },
  { heading: 'Legal', links: ['Privacy', 'Terms', 'Cookies', 'Security', 'GDPR'] },
];

/* ────────────────────────────────────────────────────────────
   CalendarMotif — inline black & white grid graphic (no radius)
   ──────────────────────────────────────────────────────────── */
const CalendarMotif: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 320 320"
    className={className}
    role="img"
    aria-label="Abstract calendar grid graphic"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="8" y="8" width="304" height="304" stroke="currentColor" strokeWidth="2" />
    {/* header band */}
    <rect x="8" y="8" width="304" height="56" fill="currentColor" />
    {/* hanger ticks */}
    <rect x="72" y="0" width="6" height="24" fill="currentColor" />
    <rect x="242" y="0" width="6" height="24" fill="currentColor" />
    {/* vertical grid lines */}
    <line x1="84" y1="64" x2="84" y2="312" stroke="currentColor" strokeWidth="2" />
    <line x1="160" y1="64" x2="160" y2="312" stroke="currentColor" strokeWidth="2" />
    <line x1="236" y1="64" x2="236" y2="312" stroke="currentColor" strokeWidth="2" />
    {/* horizontal grid lines */}
    <line x1="8" y1="126" x2="312" y2="126" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="188" x2="312" y2="188" stroke="currentColor" strokeWidth="2" />
    <line x1="8" y1="250" x2="312" y2="250" stroke="currentColor" strokeWidth="2" />
    {/* booked cell (filled) */}
    <rect x="86" y="128" width="72" height="58" fill="currentColor" />
    {/* check mark inside booked cell */}
    <path
      d="M104 158 l12 12 l22 -24"
      stroke="#fff"
      strokeWidth="6"
      strokeLinecap="square"
      className="dark:stroke-black"
    />
    {/* secondary marked cells */}
    <rect x="238" y="252" width="72" height="58" fill="currentColor" opacity="0.5" />
    <rect x="10" y="190" width="72" height="58" fill="currentColor" opacity="0.25" />
  </svg>
);

/* ────────────────────────────────────────────────────────────
   StarRow — filled monochrome stars
   ──────────────────────────────────────────────────────────── */
const StarRow: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex gap-0.5" aria-label={`Rated ${count} out of 5`}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={
          'w-4 h-4 ' +
          (i < count ? 'fill-black text-black dark:fill-neutral-100 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-700')
        }
        aria-hidden="true"
      />
    ))}
  </div>
);

/* ════════════════════════════════════════════════════════════
   LandingPage
   ════════════════════════════════════════════════════════════ */
export const LandingPage: React.FC = () => {
  // Authenticated users are intentionally allowed to view the landing page
  // (e.g. when clicking the AppointEase logo from inside the app).
  // The navbar adapts its CTAs based on auth state.

  // Set meta tags for SEO and social sharing
  useEffect(() => {
    document.title = 'AppointEase — Book Appointments with Top Service Providers';

    const setMeta = (name: string, content: string, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', 'AppointEase — Book appointments with doctors, lawyers, tutors, and more. Real-time availability, instant confirmations, and AI-powered scheduling.');
    setMeta('og:title', 'AppointEase — Book Appointments Online', true);
    setMeta('og:description', 'Find and book top service providers in your area. Instant confirmations, loyalty rewards, and an AI assistant built in.', true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', window.location.href, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'AppointEase — Smart Appointment Scheduling');
    setMeta('twitter:description', 'Book appointments with verified professionals. Doctors, lawyers, tutors and more.');

    return () => {
      document.title = 'AppointEase';
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-neutral-950 dark:text-neutral-100 overflow-x-hidden">
      <LandingNavbar />

      <main>
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 border-b border-black dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left — copy */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="inline-flex items-center gap-2 border border-black dark:border-neutral-700 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em]">
                  <span className="w-2 h-2 bg-black dark:bg-neutral-100" aria-hidden="true" />
                  Scheduling, reimagined
                </span>

                <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-[0.95]">
                  Booking,
                  <br />
                  refined.
                </h1>

                <p className="mt-6 text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md">
                  Appointments without the friction. Find a professional, lock a real-time slot, and get
                  confirmed in seconds. No phone tag, no double-bookings.
                </p>

                <div className="mt-9 flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold border transition-colors duration-200"
                    style={{ backgroundColor: '#000', color: '#fff', borderColor: '#000' }}
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 text-base font-semibold bg-white text-black border border-black hover:bg-black hover:text-white dark:bg-transparent dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-100 dark:hover:text-black transition-colors duration-200"
                  >
                    Browse providers
                  </Link>
                </div>

                {/* Stat strip */}
                <dl className="mt-12 grid grid-cols-3 border-t border-black dark:border-neutral-800 divide-x divide-black dark:divide-neutral-800">
                  <div className="py-5 pr-4">
                    <dt className="text-2xl sm:text-3xl font-bold tracking-tight">250k+</dt>
                    <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                      Booked
                    </dd>
                  </div>
                  <div className="py-5 px-4">
                    <dt className="text-2xl sm:text-3xl font-bold tracking-tight">4.9</dt>
                    <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                      Rating
                    </dd>
                  </div>
                  <div className="py-5 pl-4">
                    <dt className="text-2xl sm:text-3xl font-bold tracking-tight">24/7</dt>
                    <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                      Access
                    </dd>
                  </div>
                </dl>
              </motion.div>

              {/* Right — visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="border border-black dark:border-neutral-800">
                  <img
                    src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80"
                    alt="A planner and calendar laid out on a desk, ready for scheduling"
                    className="w-full h-72 sm:h-96 object-cover"
                    loading="eager"
                  />
                  {/* Overlay motif + label bar */}
                  <div className="grid grid-cols-2 border-t border-black dark:border-neutral-800">
                    <div className="p-6 border-r border-black dark:border-neutral-800 bg-black text-white dark:bg-neutral-100 dark:text-black">
                      <CalendarMotif className="w-full max-w-[140px]" />
                    </div>
                    <div className="p-6 flex flex-col justify-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                        Next available
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-tight">Today, 3:00 PM</p>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Confirmed instantly</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════ TRUST BAR ═══════════════ */}
        <section
          aria-label="Platform statistics"
          className="border-b border-black dark:border-neutral-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
            <Reveal>
              <p className="text-center text-xs sm:text-sm font-medium uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-400">
                Trusted by 10,000+ professionals
              </p>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 border-t border-b border-black dark:border-neutral-800 divide-y lg:divide-y-0 lg:divide-x divide-black dark:divide-neutral-800">
              <div className="pt-8 lg:pt-0 lg:px-6 py-6">
                <Counter end={250000} suffix="+" label="Appointments booked" />
              </div>
              <div className="pt-8 lg:pt-0 lg:px-6 py-6">
                <Counter end={500} suffix="+" label="Verified providers" />
              </div>
              <div className="pt-8 lg:pt-0 lg:px-6 py-6">
                <Counter end={4.9} decimals={1} suffix="★" label="Average rating" />
              </div>
              <div className="pt-8 lg:pt-0 lg:px-6 py-6">
                <Counter end={28} suffix="+" label="Cities covered" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ FEATURES ═══════════════ */}
        <section id="features" className="py-20 lg:py-28 border-b border-black dark:border-neutral-800 bg-white dark:bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">
                Features
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tighter leading-tight text-black">
                Everything you need to run appointments.
              </h2>
              <p className="mt-5 text-lg text-neutral-600">
                Built for both sides of the booking. Sharp tools, zero clutter.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-black">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <Reveal
                    key={feature.title}
                    delay={(i % 3) * 0.08}
                    className="border-b border-r border-black"
                  >
                    <div className="group h-full [perspective:1000px]">
                      <div className="relative h-full min-h-[220px] transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                        {/* Front face */}
                        <div className="absolute inset-0 [backface-visibility:hidden] p-8 lg:p-10 bg-white flex flex-col justify-center">
                          <div className="w-12 h-12 bg-black text-white flex items-center justify-center">
                            <Icon className="w-6 h-6" aria-hidden="true" />
                          </div>
                          <h3 className="mt-6 text-xl font-bold tracking-tight text-black">{feature.title}</h3>
                          <p className="mt-2 text-xs uppercase tracking-[0.15em] text-neutral-400">Hover to learn more</p>
                        </div>
                        {/* Back face */}
                        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] p-8 lg:p-10 bg-black text-white flex flex-col justify-center">
                          <Icon className="w-6 h-6 mb-4 opacity-60" aria-hidden="true" />
                          <h3 className="text-lg font-bold tracking-tight">{feature.title}</h3>
                          <p className="mt-3 text-[15px] leading-relaxed opacity-80">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════ HOW IT WORKS ═══════════════ */}
        <section id="how-it-works" className="py-20 lg:py-28 border-b border-neutral-800 dark:border-neutral-300" style={{ backgroundColor: '#000', color: '#fff' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em]" style={{ color: '#a3a3a3' }}>
                How it works
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tighter leading-tight" style={{ color: '#fff' }}>
                Three steps. That is it.
              </h2>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 border-t border-l border-neutral-700 dark:border-neutral-300">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Reveal
                    key={step.number}
                    delay={i * 0.12}
                    className="border-b border-r border-neutral-700 dark:border-neutral-300"
                  >
                    <div className="h-full p-8 lg:p-10">
                      <div className="flex items-start justify-between">
                        <span className="text-6xl lg:text-7xl font-bold tracking-tighter tabular-nums opacity-80">
                          {step.number}
                        </span>
                        <Icon className="w-8 h-8 mt-2 opacity-70" aria-hidden="true" />
                      </div>
                      <h3 className="mt-8 text-2xl font-bold tracking-tight">{step.title}</h3>
                      <p className="mt-3 text-[15px] leading-relaxed opacity-70">
                        {step.description}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════ CATEGORIES ═══════════════ */}
        <section className="py-20 lg:py-28 border-b border-black dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-400">
                Categories
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tighter leading-tight">
                Every service, one platform.
              </h2>
              <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-300">
                From clinics to studios, find and book the right professional.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 border-t border-l border-black dark:border-neutral-800">
              {categories.map((category, i) => {
                const Icon = category.icon;
                return (
                  <Reveal
                    key={category.name}
                    delay={(i % 4) * 0.06}
                    className="border-b border-r border-black dark:border-neutral-800"
                  >
                    <Link
                      to="/register"
                      className="group flex flex-col h-full p-8 bg-white dark:bg-neutral-950 hover:bg-black hover:text-white dark:hover:bg-neutral-100 dark:hover:text-black transition-colors duration-300"
                    >
                      <Icon className="w-8 h-8" aria-hidden="true" />
                      <div className="mt-10 flex items-end justify-between">
                        <span className="text-lg font-bold tracking-tight">{category.name}</span>
                        <ArrowUpRight
                          className="w-5 h-5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════ METRICS BAND (inverted) ═══════════════ */}
        <section
          aria-label="Key metrics"
          className="bg-black text-white dark:bg-neutral-100 dark:text-black border-b border-black dark:border-neutral-800 inverted light-inverted"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <Reveal className="max-w-2xl">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tighter leading-tight">
                Numbers that hold up.
              </h2>
            </Reveal>
            <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-6 divide-y lg:divide-y-0 lg:divide-x divide-neutral-700 dark:divide-neutral-300">
              <div className="lg:px-6">
                <p className="text-5xl sm:text-6xl font-bold tracking-tighter tabular-nums">99.9%</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-600">
                  Uptime
                </p>
              </div>
              <div className="lg:px-6 pt-12 lg:pt-0">
                <p className="text-5xl sm:text-6xl font-bold tracking-tighter tabular-nums">-47%</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-600">
                  No-shows
                </p>
              </div>
              <div className="lg:px-6 pt-12 lg:pt-0">
                <p className="text-5xl sm:text-6xl font-bold tracking-tighter tabular-nums">3 sec</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-600">
                  Avg. booking
                </p>
              </div>
              <div className="lg:px-6 pt-12 lg:pt-0">
                <p className="text-5xl sm:text-6xl font-bold tracking-tighter tabular-nums">10k+</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-600">
                  Professionals
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ TESTIMONIALS ═══════════════ */}
        <section id="testimonials" className="py-20 lg:py-28 border-b border-black dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-400">
                Testimonials
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tighter leading-tight">
                People who stopped scheduling by phone.
              </h2>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 border-t border-l border-black dark:border-neutral-800">
              {testimonials.map((testimonial, i) => (
                <Reveal
                  key={testimonial.name}
                  delay={i * 0.1}
                  className="border-b border-r border-black dark:border-neutral-800"
                >
                  <figure className="h-full p-8 lg:p-10 flex flex-col">
                    <StarRow count={testimonial.rating} />
                    <blockquote className="mt-6 text-lg leading-relaxed flex-1">
                      “{testimonial.quote}”
                    </blockquote>
                    <figcaption className="mt-8 pt-6 border-t border-black dark:border-neutral-800">
                      <p className="font-bold tracking-tight">{testimonial.name}</p>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{testimonial.role}</p>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ PRICING ═══════════════ */}
        <section id="pricing" className="py-20 lg:py-28 border-b border-black dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-500 dark:text-neutral-400">
                Pricing
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tighter leading-tight">
                Simple, honest pricing.
              </h2>
              <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-300">
                Free for customers. Affordable for providers. No hidden fees.
              </p>
            </Reveal>

            <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 max-w-6xl mx-auto border-t border-l border-black dark:border-neutral-800">
              {/* Customer plan */}
              <Reveal className="border-b border-r border-black dark:border-neutral-800">
                <div className="h-full p-8 lg:p-10 flex flex-col">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                    Customer
                  </p>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tighter">Free</span>
                    <span className="text-neutral-500 dark:text-neutral-400">forever</span>
                  </div>
                  <p className="mt-4 text-[15px] text-neutral-600 dark:text-neutral-300">
                    Everything you need to find and book appointments.
                  </p>
                  <ul className="mt-8 space-y-3 flex-1">
                    {customerPlanFeatures.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px]">
                        <Check className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="mt-10 inline-flex items-center justify-center w-full px-6 py-4 text-sm font-semibold bg-white text-black border border-black hover:bg-black hover:text-white dark:bg-transparent dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-100 dark:hover:text-black transition-colors duration-200"
                  >
                    Start for free
                  </Link>
                </div>
              </Reveal>

              {/* Provider plan */}
              <Reveal delay={0.1} className="border-b border-r border-black dark:border-neutral-800">
                <div className="h-full p-8 lg:p-10 flex flex-col bg-white dark:bg-neutral-950">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                      Provider
                    </p>
                  </div>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tighter">Free</span>
                    <span className="text-neutral-500 dark:text-neutral-400">onboarding</span>
                  </div>
                  <p className="mt-4 text-[15px] text-neutral-600 dark:text-neutral-300">
                    Fill out your details, upload documents, and wait for admin approval.
                  </p>
                  <ul className="mt-8 space-y-3 flex-1">
                    {providerPlanFeatures.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px]">
                        <Check className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className="mt-10 inline-flex items-center justify-center gap-2 w-full px-6 py-4 text-sm font-semibold border border-black text-black hover:bg-black hover:text-white dark:border-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-100 dark:hover:text-black transition-colors duration-200"
                  >
                    Start free trial
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>

              {/* Premium plan — inverted, most popular */}
              <Reveal delay={0.2} className="border-b border-r border-black dark:border-neutral-800">
                <div className="h-full p-8 lg:p-10 flex flex-col bg-black text-white dark:bg-neutral-100 dark:text-black inverted light-inverted">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-300 dark:text-neutral-600">
                      Premium
                    </p>
                    <span className="border border-white dark:border-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                      Most popular
                    </span>
                  </div>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tighter">₹999</span>
                    <span className="text-neutral-400 dark:text-neutral-600">/month</span>
                  </div>
                  <p className="mt-4 text-[15px] text-neutral-300 dark:text-neutral-700">
                    Unlock exclusive AI features, advanced analytics, and priority support.
                  </p>
                  <ul className="mt-8 space-y-3 flex-1">
                    {[
                      'Advanced AI Smart Slot Recommendation',
                      'Predictive Booking Intent',
                      'Advanced Analytics & Forecasting',
                      'Priority Booking & Support',
                      'Fraud Alerts & Churn Prediction',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px]">
                        <Check className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/premium"
                    className="mt-10 inline-flex items-center justify-center gap-2 w-full px-6 py-4 text-sm font-semibold border transition-colors duration-200 bg-white text-black border-white hover:bg-neutral-200 dark:bg-black dark:text-white dark:border-black dark:hover:bg-neutral-800"
                  >
                    Upgrade to Premium
                    <Zap className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══════════════ FINAL CTA ═══════════════ */}
        <section className="bg-black text-white dark:bg-neutral-100 dark:text-black border-b border-black dark:border-neutral-800 inverted light-inverted">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <Reveal className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter leading-[0.95]">
                Ready to get started?
              </h2>
              <p className="mt-6 text-lg text-neutral-300 dark:text-neutral-700">
                Join 10,000+ professionals and customers who book without the friction.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold border transition-colors duration-200"
                  style={{ backgroundColor: '#fff', color: '#000', borderColor: '#fff' }}
                >
                  Create free account
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="bg-white text-black dark:bg-neutral-950 dark:text-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              {/* Brand */}
              <div className="lg:col-span-1">
                <Link to="/" className="inline-flex items-center gap-2">
                  <span className="w-9 h-9 bg-black text-white dark:bg-neutral-100 dark:text-black flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-xl font-bold tracking-tight">AppointEase</span>
                </Link>
                <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
                  Appointments without the friction. Booking, refined.
                </p>
              </div>

              {/* Link columns */}
              <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-8">
                {footerColumns.map((column) => (
                  <nav key={column.heading} aria-label={column.heading}>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                      {column.heading}
                    </h3>
                    <ul className="mt-4 space-y-3">
                      {column.links.map((link) => (
                        <li key={link}>
                          <Link
                            to="/register"
                            className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors"
                          >
                            {link}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-14 pt-8 border-t border-black dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                © 2026 AppointEase. All rights reserved.
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center border border-black dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-neutral-100 dark:hover:text-black transition-colors"
                  aria-label="AppointEase on Twitter"
                >
                  <Twitter className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center border border-black dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-neutral-100 dark:hover:text-black transition-colors"
                  aria-label="AppointEase on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center border border-black dark:border-neutral-700 hover:bg-black hover:text-white dark:hover:bg-neutral-100 dark:hover:text-black transition-colors"
                  aria-label="AppointEase on Instagram"
                >
                  <Instagram className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

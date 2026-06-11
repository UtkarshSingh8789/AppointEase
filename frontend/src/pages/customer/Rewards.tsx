import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Star, Flame, CheckCircle, Lock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageTransition } from '@/components/layout/PageTransition';
import { cn } from '@/utils/cn';
import api from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AchievementProgress {
  total_xp: number;
  level: number;
  achievements_earned: number;
  achievements_available: number;
  next_level_xp: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  xp_reward: number;
  badge_color: string;
  is_earned: boolean;
  progress: number;
  requirement_value: number;
  earned_at: string | null;
}

type AchievementCategory = 'booking' | 'review' | 'loyalty' | 'milestone';

const CATEGORY_TABS: { key: AchievementCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'booking', label: 'Booking' },
  { key: 'review', label: 'Review' },
  { key: 'loyalty', label: 'Loyalty' },
  { key: 'milestone', label: 'Milestone' },
];

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Rewards: React.FC = () => {
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressRes, achievementsRes] = await Promise.all([
          api.get<AchievementProgress>('/achievements/me/progress'),
          api.get<{ achievements: Achievement[] }>('/achievements/me'),
        ]);
        setProgress(progressRes.data);
        setAchievements(achievementsRes.data.achievements);
      } catch {
        // Error handled by interceptor
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return achievements;
    return achievements.filter((a) => a.category === activeCategory);
  }, [achievements, activeCategory]);

  const xpPercent = progress
    ? Math.min((progress.total_xp / progress.next_level_xp) * 100, 100)
    : 0;

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Skeleton variant="card" count={1} />
          <Skeleton variant="card" count={6} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Rewards & Achievements
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Earn XP and unlock achievements by using AppointEase
          </p>
        </div>

        {/* Level & XP Section */}
        {progress && (
          <Card className="relative overflow-hidden border-2 border-primary-100 dark:border-primary-900/50">
            <div className="relative flex flex-col sm:flex-row items-center gap-6">
              {/* Level Badge */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-black dark:bg-white shadow-xl">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                      Level
                    </p>
                    <p className="text-4xl font-black text-white dark:text-black">{progress.level}</p>
                  </div>
                </div>
              </div>

              {/* XP Progress */}
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Progress to Level {progress.level + 1}
                  </span>
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {progress.total_xp} / {progress.next_level_xp} XP
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {progress.next_level_xp - progress.total_xp} XP to next level
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Row */}
        {progress && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress.total_xp}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
              </div>
            </Card>
            <Card className="text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress.achievements_earned}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Achievements Earned</p>
              </div>
            </Card>
            <Card className="text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {progress.level}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Level</p>
              </div>
            </Card>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Achievement categories">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeCategory === tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeCategory === tab.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Achievement Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          key={activeCategory}
        >
          {filteredAchievements.map((achievement) => (
            <motion.div key={achievement.id} variants={cardVariants}>
              <AchievementCard achievement={achievement} />
            </motion.div>
          ))}
        </motion.div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No achievements in this category yet
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
};

// ─── Achievement Card ─────────────────────────────────────────────────────────

interface AchievementCardProps {
  achievement: Achievement;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const progressPercent = achievement.requirement_value
    ? Math.min((achievement.progress / achievement.requirement_value) * 100, 100)
    : 0;

  return (
    <Card
      className={cn(
        'relative transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-default',
        !achievement.is_earned && 'opacity-70'
      )}
    >
      {/* Earned checkmark */}
      {achievement.is_earned && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      )}

      {/* Locked icon */}
      {!achievement.is_earned && (
        <div className="absolute top-3 right-3">
          <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
            achievement.is_earned
              ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          )}
        >
          {achievement.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'text-sm font-semibold truncate',
              achievement.is_earned
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {achievement.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {achievement.description}
          </p>

          {/* XP Reward */}
          <div className="flex items-center gap-1 mt-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              +{achievement.xp_reward} XP
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar for locked achievements */}
      {!achievement.is_earned && achievement.requirement_value > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {achievement.progress}/{achievement.requirement_value}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-400 dark:bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Earned date */}
      {achievement.is_earned && achievement.earned_at && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Earned {new Date(achievement.earned_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </Card>
  );
};

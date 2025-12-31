'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Trophy,
  ChevronRight,
  Plus,
  Zap,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RankBadge, RankProgress } from '@/components/rank-badge';
import {
  AnatomyVisualization,
  RecoveryIndicator,
  MuscleGroupData,
} from '@/components/anatomy-visualization';
import { RankTier, getRankTier } from '@/lib/scoring';

interface DashboardStats {
  user: {
    name: string | null;
    email: string;
  };
  stats: {
    workoutsThisWeek: number;
    totalWorkouts: number;
    currentStreak: number;
    longestStreak: number;
    weeklyVolume: number;
  };
  rank: {
    overall: RankTier;
    score: number;
    progress: number;
  };
  muscleScores: Record<string, number>;
  muscleRecovery: Record<string, number>;
  recentPRs: Array<{
    exercise: string;
    weight: number;
    reps: number;
    estimated1RM: number;
    date: string;
  }>;
}

function getRecoveryStatus(fraction: number): 'need_recovery' | 'recovering' | 'ready' {
  if (fraction < 0.5) return 'need_recovery';
  if (fraction < 0.8) return 'recovering';
  return 'ready';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

export default function DashboardPage() {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroupData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (!res.ok) {
          if (res.status === 404) {
            // Profile not complete - redirect to onboarding
            window.location.href = '/onboarding';
            return;
          }
          throw new Error('Failed to fetch stats');
        }
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Build muscle group data from API response
  const muscleGroups: MuscleGroupData[] = stats
    ? Object.entries(stats.muscleScores).map(([name, score]) => ({
        name,
        score,
        rank: getRankTier(score),
        recoveryStatus: getRecoveryStatus(stats.muscleRecovery[name] ?? 1),
      }))
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const userName = stats.user.name || 'there';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {userName}! 💪
          </h1>
          <p className="text-muted-foreground">
            {stats.stats.totalWorkouts > 0
              ? "Keep pushing — you're making great progress"
              : 'Ready to start your fitness journey?'}
          </p>
        </div>
        <Link href="/dashboard/workouts/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Start Workout
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Overall Rank</p>
                <RankBadge rank={stats.rank.overall} size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Streak</p>
                <p className="text-xl font-bold">{stats.stats.currentStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Dumbbell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
                <p className="text-xl font-bold">{stats.stats.totalWorkouts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weekly Volume</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">
                    {stats.stats.weeklyVolume > 0
                      ? `${(stats.stats.weeklyVolume / 1000).toFixed(1)}k`
                      : '0'}
                  </p>
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Anatomy & Rank Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rank Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rank Progress</CardTitle>
              <CardDescription>Your journey to the next tier</CardDescription>
            </CardHeader>
            <CardContent>
              <RankProgress
                currentScore={stats.rank.score}
                currentRank={stats.rank.overall}
              />
            </CardContent>
          </Card>

          {/* Muscle Group Visualization */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Muscle Group Ranks</CardTitle>
                  <CardDescription>
                    Tap a muscle group for details
                  </CardDescription>
                </div>
                <Link href="/dashboard/progress">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View all
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <AnatomyVisualization
                muscleGroups={muscleGroups}
                onMuscleClick={setSelectedMuscle}
              />

              {/* Selected muscle details */}
              {selectedMuscle && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium capitalize">
                        {selectedMuscle.name}
                      </span>
                      <RankBadge rank={selectedMuscle.rank} size="sm" />
                    </div>
                    <RecoveryIndicator status={selectedMuscle.recoveryStatus} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">{selectedMuscle.score}/100</span>
                    </div>
                    <Progress value={selectedMuscle.score} className="h-2" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recovery Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recovery Status</CardTitle>
              <CardDescription>Muscle group readiness</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {['ready', 'recovering', 'need_recovery'].map((status) => {
                const muscles = muscleGroups.filter(
                  (m) => m.recoveryStatus === status
                );
                if (muscles.length === 0) return null;
                return (
                  <div key={status} className="space-y-2">
                    <RecoveryIndicator
                      status={status as 'ready' | 'recovering' | 'need_recovery'}
                    />
                    <div className="flex flex-wrap gap-1">
                      {muscles.map((m) => (
                        <span
                          key={m.name}
                          className="px-2 py-0.5 bg-muted rounded text-xs capitalize"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {muscleGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Log your first workout to see recovery status
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent PRs */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent PRs</CardTitle>
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.recentPRs.length > 0 ? (
                stats.recentPRs.map((pr, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{pr.exercise}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(pr.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{Math.round(pr.estimated1RM)}kg</p>
                      <p className="text-xs text-muted-foreground">Est. 1RM</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No PRs yet. Start logging workouts!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/workouts/new" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="h-4 w-4" />
                  Log a Workout
                </Button>
              </Link>
              <Link href="/dashboard/profile" className="block">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Update Body Weight
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

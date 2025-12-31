'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dumbbell,
  Flame,
  TrendingUp,
  Trophy,
  ChevronRight,
  Plus,
  Zap,
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
import { RankTier } from '@/lib/scoring';

// Mock data - replace with real data from API
const mockUserData = {
  name: 'John',
  overallRank: 'gold' as RankTier,
  overallScore: 48,
  streak: 12,
  totalWorkouts: 87,
  weeklyVolume: 15200,
  weeklyChange: 8.5,
};

const mockMuscleGroups = [
  { name: 'chest', rank: 'gold' as RankTier, score: 52, recoveryStatus: 'ready' as const, lastTrained: '2 days ago', recentVolume: 5200 },
  { name: 'back', rank: 'silver' as RankTier, score: 38, recoveryStatus: 'recovering' as const, lastTrained: '1 day ago', recentVolume: 6100 },
  { name: 'shoulders', rank: 'gold' as RankTier, score: 45, recoveryStatus: 'ready' as const, lastTrained: '3 days ago', recentVolume: 3400 },
  { name: 'biceps', rank: 'silver' as RankTier, score: 35, recoveryStatus: 'ready' as const, lastTrained: '2 days ago', recentVolume: 2100 },
  { name: 'triceps', rank: 'silver' as RankTier, score: 32, recoveryStatus: 'ready' as const, lastTrained: '2 days ago', recentVolume: 1900 },
  { name: 'quads', rank: 'diamond' as RankTier, score: 58, recoveryStatus: 'need_recovery' as const, lastTrained: 'Today', recentVolume: 9100 },
  { name: 'hamstrings', rank: 'silver' as RankTier, score: 36, recoveryStatus: 'need_recovery' as const, lastTrained: 'Today', recentVolume: 6200 },
  { name: 'glutes', rank: 'gold' as RankTier, score: 48, recoveryStatus: 'need_recovery' as const, lastTrained: 'Today', recentVolume: 7800 },
  { name: 'calves', rank: 'bronze' as RankTier, score: 18, recoveryStatus: 'ready' as const, lastTrained: '5 days ago', recentVolume: 900 },
  { name: 'core', rank: 'silver' as RankTier, score: 28, recoveryStatus: 'ready' as const, lastTrained: '3 days ago', recentVolume: 2700 },
];

const mockRecentPRs = [
  { exercise: 'Barbell Back Squat', value: '140kg', date: 'Today', type: '1RM' },
  { exercise: 'Barbell Bench Press', value: '100kg', date: '3 days ago', type: '1RM' },
  { exercise: 'Barbell Deadlift', value: '180kg', date: '1 week ago', type: '1RM' },
];

const mockWeeklyInsights = [
  { type: 'volume', message: 'Volume up 8.5% from last week', positive: true },
  { type: 'neglected', message: 'Calves not trained in 5 days', positive: false },
  { type: 'pr', message: '2 new PRs this week!', positive: true },
];

export default function DashboardPage() {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroupData | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {mockUserData.name}! 💪
          </h1>
          <p className="text-muted-foreground">
            Keep pushing — you&apos;re making great progress
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
                <RankBadge rank={mockUserData.overallRank} size="sm" />
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
                <p className="text-xl font-bold">{mockUserData.streak} days</p>
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
                <p className="text-xl font-bold">{mockUserData.totalWorkouts}</p>
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
                    {(mockUserData.weeklyVolume / 1000).toFixed(1)}k
                  </p>
                  <span className="text-xs text-green-500">
                    +{mockUserData.weeklyChange}%
                  </span>
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
                currentScore={mockUserData.overallScore}
                currentRank={mockUserData.overallRank}
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
                muscleGroups={mockMuscleGroups}
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recent volume</span>
                      <span className="font-medium">
                        {selectedMuscle.recentVolume ? `${selectedMuscle.recentVolume.toLocaleString()} kg` : 'n/a'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last trained: {selectedMuscle.lastTrained}
                    </p>
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
                const muscles = mockMuscleGroups.filter(
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
              {mockRecentPRs.map((pr, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{pr.exercise}</p>
                    <p className="text-xs text-muted-foreground">{pr.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{pr.value}</p>
                    <p className="text-xs text-muted-foreground">{pr.type}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weekly Insights */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Weekly Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {mockWeeklyInsights.map((insight, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg text-sm ${
                    insight.positive
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {insight.message}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

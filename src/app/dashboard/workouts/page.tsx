'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Calendar,
  Dumbbell,
  Clock,
  ChevronRight,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RankBadge } from '@/components/rank-badge';
import { RankTier } from '@/lib/scoring';

interface Workout {
  id: string;
  date: string;
  name: string | null;
  type: string;
  duration: number;
  exercises: Array<{
    name: string;
    sets: number;
    topSet: string;
  }>;
  volume: number;
  prs: string[];
}

const typeColors: Record<string, string> = {
  push: 'bg-red-500/10 text-red-500',
  pull: 'bg-blue-500/10 text-blue-500',
  legs: 'bg-green-500/10 text-green-500',
  upper: 'bg-purple-500/10 text-purple-500',
  lower: 'bg-orange-500/10 text-orange-500',
  full_body: 'bg-cyan-500/10 text-cyan-500',
  custom: 'bg-gray-500/10 text-gray-500',
};

export default function WorkoutsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkouts() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) throw new Error('Failed to fetch workouts');
        const data = await res.json();
        
        // Transform API response to match component's expected format
        const transformedWorkouts: Workout[] = data.sessions.map((session: {
          id: string;
          startTime: string;
          endTime: string | null;
          name: string | null;
          workoutType: string | null;
          exercises: Array<{
            exercise: { name: string };
            sets: Array<{ weight: number; reps: number; isWarmup: boolean }>;
          }>;
        }) => {
          const startTime = new Date(session.startTime);
          const endTime = session.endTime ? new Date(session.endTime) : new Date();
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          
          let totalVolume = 0;
          const exerciseData = session.exercises.map((ex) => {
            const workingSets = ex.sets.filter(s => !s.isWarmup);
            const topSet = workingSets.length > 0 
              ? workingSets.reduce((max, s) => s.weight > max.weight ? s : max, workingSets[0])
              : null;
            
            workingSets.forEach(s => {
              totalVolume += s.weight * s.reps;
            });

            return {
              name: ex.exercise.name,
              sets: workingSets.length,
              topSet: topSet ? `${topSet.weight}lb x ${topSet.reps}` : '-',
            };
          });

          return {
            id: session.id,
            date: session.startTime.split('T')[0],
            name: session.name,
            type: session.workoutType || 'custom',
            duration,
            exercises: exerciseData,
            volume: totalVolume,
            prs: [], // We'd need to track PRs per session
          };
        });

        setWorkouts(transformedWorkouts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkouts();
  }, []);

  const filteredWorkouts = workouts.filter(
    (w) =>
      (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.exercises.some((e) =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground">
            View and manage your workout history
          </p>
        </div>
        <Link href="/dashboard/workouts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Workout
          </Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workouts or exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{workouts.length}</p>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">
                  {workouts.length > 0
                    ? Math.round(workouts.reduce((acc, w) => acc + w.duration, 0) / 60)
                    : 0}h
                </p>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">
                  {workouts.length > 0
                    ? (workouts.reduce((acc, w) => acc + w.volume, 0) / 1000).toFixed(1)
                    : 0}k
                </p>
                <p className="text-xs text-muted-foreground">Volume (lb)</p>
              </CardContent>
            </Card>
          </div>

          {/* Workout List */}
          <div className="space-y-4">
            {filteredWorkouts.map((workout) => (
              <Link key={workout.id} href={`/dashboard/workouts/${workout.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                              typeColors[workout.type] || typeColors.custom
                            }`}
                          >
                            {workout.type.replace('_', ' ')}
                          </span>
                          {workout.prs.length > 0 && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500">
                              🏆 {workout.prs.length} PR
                              {workout.prs.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium">{workout.name || 'Workout'}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(workout.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {workout.duration}min
                          </span>
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {workout.exercises.length} exercises
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {workout.exercises.slice(0, 3).map((ex, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-muted rounded text-xs"
                            >
                              {ex.name}
                            </span>
                          ))}
                          {workout.exercises.length > 3 && (
                            <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                              +{workout.exercises.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {filteredWorkouts.length === 0 && workouts.length > 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No workouts match your search</p>
              </div>
            )}

            {workouts.length === 0 && (
              <div className="text-center py-12">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No workouts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start logging your first workout to track your progress
                </p>
                <Link href="/dashboard/workouts/new">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Start First Workout
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Timer,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Dumbbell,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SetData {
  id: string;
  reps: string;
  weight: string;
  rpe: string;
  isWarmup: boolean;
  completed: boolean;
}

interface ExerciseData {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: SetData[];
  isExpanded: boolean;
  notes: string;
  isDumbbell?: boolean;
  dumbbellMode?: 'single' | 'paired';
}

interface MuscleContribution {
  isPrimary: boolean;
  contributionPercentage: number;
  muscleGroup: {
    id: string;
    name: string;
    bodyArea: string;
  };
}

interface Exercise {
  id: string;
  name: string;
  category: string;
  equipmentType: string;
  movementPattern: string | null;
  muscleContributions: MuscleContribution[];
}

const WORKOUT_TYPES = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'lower', label: 'Lower Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'custom', label: 'Custom' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptySet(): SetData {
  return {
    id: generateId(),
    reps: '',
    weight: '',
    rpe: '',
    isWarmup: false,
    completed: false,
  };
}

export default function NewWorkoutPage() {
  const router = useRouter();
  const [workoutType, setWorkoutType] = useState('');
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [workoutStartTime] = useState(() => new Date());
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set());

  // Fetch exercises from API
  useEffect(() => {
    async function fetchExercises() {
      setIsLoadingExercises(true);
      try {
        const res = await fetch('/api/exercises');
        if (res.ok) {
          const data = await res.json();
          // API returns exercises array directly
          setAvailableExercises(Array.isArray(data) ? data : data.exercises || []);
        }
      } catch (error) {
        console.error('Failed to fetch exercises:', error);
      } finally {
        setIsLoadingExercises(false);
      }
    }
    fetchExercises();
  }, []);

  // Rest timer
  useEffect(() => {
    if (restTimeRemaining > 0) {
      const interval = setInterval(() => {
        setRestTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [restTimeRemaining]);

  // Helper to get primary muscle group from an exercise
  const getPrimaryMuscle = (exercise: Exercise): string => {
    const primary = exercise.muscleContributions.find(mc => mc.isPrimary);
    return primary?.muscleGroup.name || 'Other';
  };

  // Map workout types to relevant muscle groups and movement patterns
  const workoutTypeRelevance: Record<string, { muscles: string[]; patterns: string[] }> = {
    push: { muscles: ['chest', 'shoulders', 'triceps'], patterns: ['push'] },
    pull: { muscles: ['back', 'biceps'], patterns: ['pull'] },
    legs: { muscles: ['quads', 'hamstrings', 'glutes', 'calves'], patterns: ['squat', 'hinge'] },
    upper: { muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], patterns: ['push', 'pull'] },
    lower: { muscles: ['quads', 'hamstrings', 'glutes', 'calves'], patterns: ['squat', 'hinge'] },
    full_body: { muscles: [], patterns: [] },
    custom: { muscles: [], patterns: [] },
  };

  // Check if an exercise is relevant to the current workout type
  const isExerciseRelevant = (exercise: Exercise): boolean => {
    if (!workoutType || !workoutTypeRelevance[workoutType]) return false;
    const { muscles, patterns } = workoutTypeRelevance[workoutType];
    
    // Check movement pattern
    if (exercise.movementPattern && patterns.includes(exercise.movementPattern.toLowerCase())) {
      return true;
    }
    
    // Check if primary muscle matches
    const primaryMuscle = getPrimaryMuscle(exercise).toLowerCase();
    return muscles.includes(primaryMuscle);
  };

  // Filter and group exercises by muscle group
  const filteredExercises = availableExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group exercises by primary muscle
  const groupedExercises = filteredExercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const muscle = getPrimaryMuscle(ex);
    const displayName = muscle.charAt(0).toUpperCase() + muscle.slice(1);
    if (!acc[displayName]) acc[displayName] = [];
    acc[displayName].push(ex);
    return acc;
  }, {});

  // Sort muscle groups - prioritize relevant ones based on workout type
  const sortedMuscleGroups = Object.keys(groupedExercises).sort((a, b) => {
    if (!workoutType || !workoutTypeRelevance[workoutType]) {
      return a.localeCompare(b);
    }
    
    const relevantMuscles = workoutTypeRelevance[workoutType].muscles.map(m => 
      m.charAt(0).toUpperCase() + m.slice(1)
    );
    
    const aIsRelevant = relevantMuscles.includes(a);
    const bIsRelevant = relevantMuscles.includes(b);
    
    if (aIsRelevant && !bIsRelevant) return -1;
    if (!aIsRelevant && bIsRelevant) return 1;
    return a.localeCompare(b);
  });

  // Toggle exercise selection
  const toggleExerciseSelection = (exerciseId: string) => {
    setSelectedExerciseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  // Add all selected exercises
  const addSelectedExercises = () => {
    const selectedExercises = availableExercises.filter(ex => selectedExerciseIds.has(ex.id));
    const newExercises: ExerciseData[] = selectedExercises.map(exercise => ({
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [createEmptySet()],
      isExpanded: true,
      notes: '',
      isDumbbell: exercise.equipmentType === 'dumbbell',
      dumbbellMode: exercise.equipmentType === 'dumbbell' ? 'paired' : undefined,
    }));
    setExercises([...exercises, ...newExercises]);
    setShowExerciseSearch(false);
    setSearchQuery('');
    setSelectedExerciseIds(new Set());
  };

  const addExercise = (exercise: Exercise) => {
    const newExercise: ExerciseData = {
      id: generateId(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [createEmptySet()],
      isExpanded: true,
      notes: '',
      isDumbbell: exercise.equipmentType === 'dumbbell',
      dumbbellMode: exercise.equipmentType === 'dumbbell' ? 'paired' : undefined,
    };
    setExercises([...exercises, newExercise]);
    setShowExerciseSearch(false);
    setSearchQuery('');
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter((e) => e.id !== exerciseId));
  };

  const toggleExerciseExpanded = (exerciseId: string) => {
    setExercises(
      exercises.map((e) =>
        e.id === exerciseId ? { ...e, isExpanded: !e.isExpanded } : e
      )
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map((e) => {
        if (e.id !== exerciseId) return e;
        
        // Get the last non-warmup set to copy values from
        const lastSet = [...e.sets].reverse().find(s => !s.isWarmup) || e.sets[e.sets.length - 1];
        
        const newSet: SetData = {
          id: generateId(),
          reps: lastSet?.reps || '',
          weight: lastSet?.weight || '',
          rpe: lastSet?.rpe || '',
          isWarmup: false,
          completed: false,
        };
        
        return { ...e, sets: [...e.sets, newSet] };
      })
    );
  };

  const updateSet = (
    exerciseId: string,
    setId: string,
    field: keyof SetData,
    value: string | boolean
  ) => {
    setExercises(
      exercises.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map((e) =>
        e.id === exerciseId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e
      )
    );
  };

  const completeSet = (exerciseId: string, setId: string) => {
    updateSet(exerciseId, setId, 'completed', true);
    // Start rest timer
    if (restTimer) {
      setRestTimeRemaining(restTimer);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    
    try {
      // Build the session payload
      const payload = {
        name: workoutName || undefined,
        type: workoutType || 'custom',
        startTime: workoutStartTime.toISOString(),
        endTime: new Date().toISOString(),
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets
            .filter((s) => s.completed && s.weight && s.reps)
            .map((s) => ({
              reps: parseInt(s.reps),
              weight: parseFloat(s.weight),
              weightUnit: 'lb',
              rpe: s.rpe ? parseFloat(s.rpe) : null,
              isWarmup: s.isWarmup,
              isDumbbellPair: ex.dumbbellMode === 'paired',
            })),
        })).filter((ex) => ex.sets.length > 0),
      };

      if (payload.exercises.length === 0) {
        setSaveError('Complete at least one set before saving');
        setIsSaving(false);
        return;
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save workout');
      }

      const data = await res.json();
      
      // Show PR notification if any
      if (data.newPRs && data.newPRs.length > 0) {
        // Could add a toast notification here
        console.log('New PRs:', data.newPRs);
      }

      router.push('/dashboard/workouts');
    } catch (error) {
      console.error('Failed to save workout:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">New Workout</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || exercises.length === 0}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Workout
        </Button>
      </div>

      {/* Save Error */}
      {saveError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {saveError}
        </div>
      )}

      {/* Workout Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Workout Type</Label>
              <Select value={workoutType} onValueChange={setWorkoutType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session Name (optional)</Label>
              <Input
                placeholder="e.g., Morning Push"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rest Timer */}
      {restTimeRemaining > 0 && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary" />
                <span className="font-medium">Rest Timer</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">
                  {formatTime(restTimeRemaining)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRestTimeRemaining(0)}
                >
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercises */}
      <div className="space-y-4">
        {exercises.map((exercise, exerciseIndex) => (
          <Card key={exercise.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-left"
                  onClick={() => toggleExerciseExpanded(exercise.id)}
                >
                  {exercise.isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <div>
                    <CardTitle className="text-base">
                      {exercise.exerciseName}
                    </CardTitle>
                    <CardDescription>
                      {exercise.sets.filter((s) => s.completed).length} /{' '}
                      {exercise.sets.length} sets completed
                    </CardDescription>
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeExercise(exercise.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {exercise.isExpanded && (
              <CardContent className="space-y-4">
                {/* Dumbbell mode toggle */}
                {exercise.isDumbbell && (
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Dumbbell Mode:</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          exercise.dumbbellMode === 'paired' ? 'default' : 'outline'
                        }
                        onClick={() =>
                          setExercises(
                            exercises.map((e) =>
                              e.id === exercise.id
                                ? { ...e, dumbbellMode: 'paired' }
                                : e
                            )
                          )
                        }
                      >
                        Paired (×2)
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          exercise.dumbbellMode === 'single' ? 'default' : 'outline'
                        }
                        onClick={() =>
                          setExercises(
                            exercises.map((e) =>
                              e.id === exercise.id
                                ? { ...e, dumbbellMode: 'single' }
                                : e
                            )
                          )
                        }
                      >
                        Single
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sets header */}
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-2">
                  <div className="col-span-1">Set</div>
                  <div className="col-span-3">Weight (lb)</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-2">RPE</div>
                  <div className="col-span-3"></div>
                </div>

                {/* Sets */}
                {exercise.sets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className={cn(
                      'grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-colors',
                      set.completed && 'bg-green-500/10',
                      set.isWarmup && 'opacity-60'
                    )}
                  >
                    <div className="col-span-1 text-sm font-medium">
                      {set.isWarmup ? 'W' : setIndex + 1}
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.weight}
                        onChange={(e) =>
                          updateSet(exercise.id, set.id, 'weight', e.target.value)
                        }
                        className="h-9"
                        disabled={set.completed}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="0"
                        value={set.reps}
                        onChange={(e) =>
                          updateSet(exercise.id, set.id, 'reps', e.target.value)
                        }
                        className="h-9"
                        disabled={set.completed}
                      />
                    </div>
                    <div className="col-span-2">
                      <Select
                        value={set.rpe}
                        onValueChange={(v) =>
                          updateSet(exercise.id, set.id, 'rpe', v)
                        }
                        disabled={set.completed}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 6, 7, 8, 9, 10].map((rpe) => (
                            <SelectItem key={rpe} value={rpe.toString()}>
                              {rpe}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 flex items-center gap-1">
                      {!set.completed ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={!set.weight || !set.reps}
                          onClick={() => completeSet(exercise.id, set.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-green-500 font-medium">
                          ✓ Done
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => removeSet(exercise.id, set.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add set button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => addSet(exercise.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Set
                </Button>
              </CardContent>
            )}
          </Card>
        ))}

        {/* Add Exercise */}
        {showExerciseSearch ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Add Exercise</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedExerciseIds.size > 0 && (
                    <Button
                      size="sm"
                      onClick={addSelectedExercises}
                    >
                      Add {selectedExerciseIds.size} Exercise{selectedExerciseIds.size > 1 ? 's' : ''}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowExerciseSearch(false);
                      setSearchQuery('');
                      setSelectedExerciseIds(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <div className="max-h-80 overflow-y-auto space-y-4">
                {isLoadingExercises ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedMuscleGroups.length > 0 ? (
                  sortedMuscleGroups.map((muscleGroup) => {
                    const isRecommended = workoutType && workoutTypeRelevance[workoutType]?.muscles
                      .map(m => m.charAt(0).toUpperCase() + m.slice(1))
                      .includes(muscleGroup);
                    
                    return (
                      <div key={muscleGroup}>
                        <h4 className={cn(
                          "text-xs font-semibold uppercase tracking-wider mb-2 px-1 flex items-center gap-2",
                          isRecommended ? "text-primary" : "text-muted-foreground"
                        )}>
                          {muscleGroup}
                          {isRecommended && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary normal-case tracking-normal">
                              Recommended
                            </span>
                          )}
                        </h4>
                        <div className="space-y-1">
                          {groupedExercises[muscleGroup].map((exercise) => {
                            const isSelected = selectedExerciseIds.has(exercise.id);
                            return (
                              <button
                                key={exercise.id}
                                className={cn(
                                  "w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left",
                                  isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                                )}
                                onClick={() => toggleExerciseSelection(exercise.id)}
                              >
                                <div>
                                  <p className="font-medium text-sm">{exercise.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {exercise.equipmentType.replace('_', ' ')} • {exercise.movementPattern || 'General'}
                                  </p>
                                </div>
                                {isSelected ? (
                                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No exercises found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            className="w-full h-14 border-dashed"
            onClick={() => setShowExerciseSearch(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Exercise
          </Button>
        )}
      </div>

      {/* Rest Timer Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Rest Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select
              value={restTimer?.toString() || 'off'}
              onValueChange={(v) => setRestTimer(v === 'off' ? null : parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Off" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="60">1:00</SelectItem>
                <SelectItem value="90">1:30</SelectItem>
                <SelectItem value="120">2:00</SelectItem>
                <SelectItem value="180">3:00</SelectItem>
                <SelectItem value="300">5:00</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Auto-start after completing a set
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {exercises.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No exercises yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add your first exercise to start tracking
          </p>
        </div>
      )}
    </div>
  );
}

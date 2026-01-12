'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Dumbbell,
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Scale,
  Timer,
  Target,
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
import { Progress } from '@/components/ui/progress';

type OnboardingData = {
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  trainingAgeYears: string;
  preferredUnits: string;
  benchPress1RM: string;
  squat1RM: string;
  deadlift1RM: string;
};

const STEPS = [
  { title: 'Basic Info', icon: User, description: 'Tell us about yourself' },
  { title: 'Body Metrics', icon: Scale, description: 'Your current measurements' },
  { title: 'Experience', icon: Timer, description: 'Your training background' },
  { title: 'Strength Test', icon: Target, description: 'Establish your baseline' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    age: '',
    sex: '',
    heightCm: '',
    weightKg: '',
    trainingAgeYears: '',
    preferredUnits: 'lb',
    benchPress1RM: '',
    squat1RM: '',
    deadlift1RM: '',
  });

  const updateData = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (step) {
      case 0:
        return data.age && data.sex;
      case 1:
        return data.heightCm && data.weightKg;
      case 2:
        return data.trainingAgeYears !== '';
      case 3:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    // Wait for session to be ready
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated' || !session) {
      setError('You must be logged in to complete setup. Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Convert age to birthDate (approximate)
      const age = parseInt(data.age);
      const birthDate = age ? new Date(new Date().getFullYear() - age, 0, 1).toISOString() : null;

      // Convert units if using imperial
      const isMetric = data.preferredUnits === 'kg';
      const height = parseFloat(data.heightCm) || null;
      const bodyWeight = parseFloat(data.weightKg) || null;

      // Save profile
      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          sex: data.sex || null,
          height,
          heightUnit: isMetric ? 'cm' : 'in',
          bodyWeight,
          weightUnit: isMetric ? 'kg' : 'lb',
          trainingAgeYears: parseFloat(data.trainingAgeYears) || 0,
          preferredUnits: data.preferredUnits,
        }),
      });

      if (!profileRes.ok) {
        const errorData = await profileRes.json();
        setError(errorData.error || 'Failed to save profile. Please try again.');
        console.error('Failed to save profile:', errorData);
        return;
      }

      // Save initial PRs if provided (convert from lb to kg if needed)
      const conversionFactor = isMetric ? 1 : 0.453592; // lb to kg
      const prs: Array<{ exerciseName: string; estimated1RM: number }> = [];

      if (data.benchPress1RM && parseFloat(data.benchPress1RM) > 0) {
        prs.push({
          exerciseName: 'Barbell Bench Press',
          estimated1RM: parseFloat(data.benchPress1RM) * conversionFactor,
        });
      }

      if (data.squat1RM && parseFloat(data.squat1RM) > 0) {
        prs.push({
          exerciseName: 'Barbell Back Squat',
          estimated1RM: parseFloat(data.squat1RM) * conversionFactor,
        });
      }

      if (data.deadlift1RM && parseFloat(data.deadlift1RM) > 0) {
        prs.push({
          exerciseName: 'Barbell Deadlift',
          estimated1RM: parseFloat(data.deadlift1RM) * conversionFactor,
        });
      }

      // Only save PRs if user provided any
      if (prs.length > 0) {
        const prRes = await fetch('/api/prs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prs }),
        });

        if (!prRes.ok) {
          console.warn('Failed to save initial PRs, continuing anyway');
        }
      }

      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Failed to save profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="25"
                min="13"
                max="100"
                value={data.age}
                onChange={(e) => updateData('age', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sex</Label>
              <Select value={data.sex} onValueChange={(v) => updateData('sex', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other / Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for strength comparisons within your demographic
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Preferred Units</Label>
              <Select
                value={data.preferredUnits}
                onValueChange={(v) => updateData('preferredUnits', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Metric (kg, cm)</SelectItem>
                  <SelectItem value="lb">Imperial (lb, in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">
                  Height ({data.preferredUnits === 'kg' ? 'cm' : 'inches'})
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder={data.preferredUnits === 'kg' ? '175' : '69'}
                  value={data.heightCm}
                  onChange={(e) => updateData('heightCm', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">
                  Weight ({data.preferredUnits === 'kg' ? 'kg' : 'lb'})
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder={data.preferredUnits === 'kg' ? '75' : '165'}
                  value={data.weightKg}
                  onChange={(e) => updateData('weightKg', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Used for calculating relative strength and fair rankings
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>How long have you been lifting?</Label>
              <Select
                value={data.trainingAgeYears}
                onValueChange={(v) => updateData('trainingAgeYears', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Just starting out</SelectItem>
                  <SelectItem value="0.5">Less than 1 year</SelectItem>
                  <SelectItem value="1">1-2 years</SelectItem>
                  <SelectItem value="2">2-3 years</SelectItem>
                  <SelectItem value="3">3-5 years</SelectItem>
                  <SelectItem value="5">5+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Your training level affects:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Recovery time estimates</li>
                <li>• Volume recommendations</li>
                <li>• Rank decay rate during breaks</li>
              </ul>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Optional: Enter your estimated 1RM for the big three lifts to establish
              your baseline rank. You can skip this and we&apos;ll calculate it from your
              workouts.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bench">
                  Bench Press ({data.preferredUnits === 'kg' ? 'kg' : 'lb'})
                </Label>
                <Input
                  id="bench"
                  type="number"
                  placeholder="100"
                  value={data.benchPress1RM}
                  onChange={(e) => updateData('benchPress1RM', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="squat">
                  Back Squat ({data.preferredUnits === 'kg' ? 'kg' : 'lb'})
                </Label>
                <Input
                  id="squat"
                  type="number"
                  placeholder="140"
                  value={data.squat1RM}
                  onChange={(e) => updateData('squat1RM', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadlift">
                  Deadlift ({data.preferredUnits === 'kg' ? 'kg' : 'lb'})
                </Label>
                <Input
                  id="deadlift"
                  type="number"
                  placeholder="180"
                  value={data.deadlift1RM}
                  onChange={(e) => updateData('deadlift1RM', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Gymenace
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm text-center">
            {error}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-1 ${
                  i === step
                    ? 'text-primary'
                    : i < step
                    ? 'text-primary/60'
                    : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`p-2 rounded-full transition-colors ${
                    i === step
                      ? 'bg-primary/20'
                      : i < step
                      ? 'bg-primary/10'
                      : 'bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs hidden sm:block">{s.title}</span>
              </div>
            );
          })}
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>{STEPS[step].title}</CardTitle>
                <CardDescription>{STEPS[step].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>{renderStep()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

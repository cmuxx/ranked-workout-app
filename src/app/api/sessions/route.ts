import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { estimate1RM } from '@/lib/scoring';

// GET - Fetch user's workout sessions
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sessions = await db.session.findMany({
      where: { userId: user.id },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                muscleContributions: {
                  include: {
                    muscleGroup: true,
                  },
                },
              },
            },
            sets: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
    });

    // Calculate muscle group impact for each session
    const sessionsWithImpact = sessions.map(session => {
      const muscleImpact: Record<string, number> = {};

      for (const exerciseLog of session.exercises) {
        const workingSets = exerciseLog.sets.filter(s => !s.isWarmup);
        if (workingSets.length === 0) continue;

        // Calculate total volume for this exercise
        const exerciseVolume = workingSets.reduce((sum, set) => sum + set.weight * set.reps, 0);

        // Distribute impact across muscle groups based on contribution percentage
        for (const contrib of exerciseLog.exercise.muscleContributions) {
          const muscleGroupName = contrib.muscleGroup.name;
          const impact = Math.round((exerciseVolume * contrib.contributionPercentage) / 100);
          muscleImpact[muscleGroupName] = (muscleImpact[muscleGroupName] || 0) + impact;
        }
      }

      return {
        ...session,
        muscleImpact,
      };
    });

    const total = await db.session.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      sessions: sessionsWithImpact,
      total,
      hasMore: offset + sessionsWithImpact.length < total,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST - Create a new workout session
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, exercises, startTime, endTime, notes } = body;

    // Calculate duration in minutes
    const sessionStart = startTime ? new Date(startTime) : new Date();
    const sessionEnd = endTime ? new Date(endTime) : new Date();
    const durationMin = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000);

    // Validate required fields
    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'At least one exercise is required' },
        { status: 400 }
      );
    }

    // Create the session with nested exercises and sets
    const newSession = await db.session.create({
      data: {
        userId: user.id,
        startTime: sessionStart,
        endTime: sessionEnd,
        durationMin: durationMin > 0 ? durationMin : null,
        workoutType: type || 'custom',
        notes: notes || null,
        exercises: {
          create: exercises.map((exercise: any, exerciseIndex: number) => ({
            exerciseId: exercise.exerciseId,
            orderIndex: exerciseIndex,
            sets: {
              create: exercise.sets.map((set: any, setIndex: number) => ({
                setNumber: setIndex + 1,
                reps: set.reps,
                weight: set.weight,
                weightUnit: set.weightUnit || 'lb',
                rpe: set.rpe || null,
                rir: set.rir || null,
                isDumbbellPair: set.isDumbbellPair || false,
                isWarmup: set.isWarmup || false,
                isDropSet: set.isDropSet || false,
                isFailure: set.isFailure || false,
                restAfter: set.restAfter || null,
              })),
            },
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
        },
      },
    });

    // Process PRs and update muscle group scores
    const newPRs: any[] = [];
    const muscleGroupUpdates: Record<string, { volume: number; maxE1RM: number }> = {};

    for (const exerciseLog of newSession.exercises) {
      const exercise = exerciseLog.exercise;
      
      // Calculate best set and estimated 1RM for this exercise
      let bestE1RM = 0;
      let bestSet = null;

      for (const set of exerciseLog.sets) {
        if (set.isWarmup) continue;
        
        const e1rm = estimate1RM(set.weight, set.reps);
        if (e1rm > bestE1RM) {
          bestE1RM = e1rm;
          bestSet = set;
        }
      }

      if (bestE1RM > 0) {
        // Check if this is a new PR
        const existingPR = await db.pRRecord.findFirst({
          where: {
            userId: user.id,
            exerciseId: exercise.id,
          },
          orderBy: { estimated1RM: 'desc' },
        });

        if (!existingPR || bestE1RM > existingPR.estimated1RM) {
          // Create new PR record
          const pr = await db.pRRecord.create({
            data: {
              userId: user.id,
              exerciseId: exercise.id,
              weight: bestSet!.weight,
              reps: bestSet!.reps,
              estimated1RM: bestE1RM,
              date: new Date(),
            },
            include: { exercise: true },
          });
          newPRs.push({
            exercise: exercise.name,
            weight: bestSet!.weight,
            reps: bestSet!.reps,
            estimated1RM: bestE1RM,
            improvement: existingPR ? bestE1RM - existingPR.estimated1RM : null,
          });
        }

        // Get muscle contributions for this exercise
        const contributions = await db.muscleContribution.findMany({
          where: { exerciseId: exercise.id },
          include: { muscleGroup: true },
        });

        for (const contrib of contributions) {
          const muscleId = contrib.muscleGroupId;
          if (!muscleGroupUpdates[muscleId]) {
            muscleGroupUpdates[muscleId] = { volume: 0, maxE1RM: 0 };
          }
          
          // Apply contribution percentage to volume
          const setVolume = exerciseLog.sets
            .filter((s: { isWarmup: boolean }) => !s.isWarmup)
            .reduce((sum: number, s: { weight: number; reps: number }) => sum + s.weight * s.reps, 0);
          
          muscleGroupUpdates[muscleId].volume += setVolume * (contrib.contributionPercentage / 100);
          
          if (bestE1RM > muscleGroupUpdates[muscleId].maxE1RM) {
            muscleGroupUpdates[muscleId].maxE1RM = bestE1RM * (contrib.contributionPercentage / 100);
          }
        }
      }
    }

    // Update user's streak
    const lastSession = await db.session.findFirst({
      where: {
        userId: user.id,
        id: { not: newSession.id },
      },
      orderBy: { startTime: 'desc' },
    });

    let newStreak = 1; // Default to 1 for a new workout
    
    if (lastSession) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastWorkoutDate = new Date(lastSession.startTime);
      lastWorkoutDate.setHours(0, 0, 0, 0);
      
      const todayWorkoutDate = new Date(newSession.startTime);
      todayWorkoutDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor(
        (todayWorkoutDate.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === 0) {
        // Same day - keep current streak, don't increment
        newStreak = user.currentStreak || 1;
      } else if (daysDiff === 1) {
        // Consecutive day - increment streak
        newStreak = (user.currentStreak || 0) + 1;
      } else {
        // Gap of 2+ days - reset streak to 1
        newStreak = 1;
      }
    }

    // Update user streak
    await db.user.update({
      where: { id: user.id },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(user.longestStreak, newStreak),
        lastWorkoutAt: new Date(),
      },
    });

    // Calculate muscle group impact summary for the modal
    const muscleImpactSummary: Record<string, { volume: number; sets: number }> = {};

    for (const [muscleId, data] of Object.entries(muscleGroupUpdates)) {
      // Get muscle group name
      const muscleGroup = await db.muscleGroup.findUnique({
        where: { id: muscleId },
      });
      if (muscleGroup) {
        muscleImpactSummary[muscleGroup.name] = {
          volume: Math.round(data.volume),
          sets: 0, // Will be calculated below
        };
      }
    }

    // Count sets per muscle group
    for (const exerciseLog of newSession.exercises) {
      const contributions = await db.muscleContribution.findMany({
        where: { exerciseId: exerciseLog.exerciseId },
        include: { muscleGroup: true },
      });

      const workingSets = exerciseLog.sets.filter((s: { isWarmup: boolean }) => !s.isWarmup).length;

      for (const contrib of contributions) {
        const muscleName = contrib.muscleGroup.name;
        if (muscleImpactSummary[muscleName]) {
          muscleImpactSummary[muscleName].sets += Math.round(workingSets * contrib.contributionPercentage / 100);
        }
      }
    }

    return NextResponse.json({
      session: newSession,
      newPRs,
      streak: newStreak,
      muscleImpact: muscleImpactSummary,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

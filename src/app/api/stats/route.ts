import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  calculateStrengthScore, 
  determineRank, 
  calculateRecoveryState, 
  RankTier,
  applyRecencyDecay,
  calculateVolumeScore,
  calculateMuscleScore,
  applyEvidenceGating,
  isQualifyingStrengthSet,
  getVolumeLandmarks
} from '@/lib/scoring';
import scoringConfig from '@/../config/scoring.json';

// GET - Fetch user's dashboard stats
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get workout count this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const workoutsThisWeek = await db.session.count({
      where: {
        userId: user.id,
        startTime: { gte: weekStart },
      },
    });

    // Get total workout count
    const totalWorkouts = await db.session.count({
      where: { userId: user.id },
    });

    // Get recent PRs
    const recentPRs = await db.pRRecord.findMany({
      where: { userId: user.id },
      include: { exercise: true },
      orderBy: { date: 'desc' },
      take: 5,
    });

    // Get muscle group scores (latest snapshot or calculate from PRs)
    const muscleGroups = await db.muscleGroup.findMany();
    
    const muscleScores: Record<string, number> = {};
    const muscleRecovery: Record<string, number> = {};

    // Get sessions in the last 56 days for evidence gating
    const fiftyySixDaysAgo = new Date();
    fiftyySixDaysAgo.setDate(fiftyySixDaysAgo.getDate() - 56);
    
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    
    const sessionsLast56Days = await db.session.count({
      where: {
        userId: user.id,
        startTime: { gte: fiftyySixDaysAgo },
      },
    });
    
    const sessionsLast28Days = await db.session.count({
      where: {
        userId: user.id,
        startTime: { gte: twentyEightDaysAgo },
      },
    });

    // Get training age for volume landmarks
    const trainingAgeYears = user.profile?.trainingAgeYears ?? 1;

    for (const mg of muscleGroups) {
      // Get all exercises that contribute to this muscle group (primary or secondary)
      // We use a minimum threshold of 10% to filter out negligible contributions
      const exercisesForMuscle = await db.exercise.findMany({
        where: {
          muscleContributions: {
            some: {
              muscleGroupId: mg.id,
              contributionPercentage: { gte: 10 }, // Include secondary muscles (10%+)
            },
          },
        },
        include: {
          muscleContributions: {
            where: {
              muscleGroupId: mg.id,
            },
          },
        },
      });

      let weightedScoreSum = 0;
      let totalWeight = 0;
      let maxContribution = 0; // Track the highest contribution percentage

      for (const exercise of exercisesForMuscle) {
        const bestPR = await db.pRRecord.findFirst({
          where: {
            userId: user.id,
            exerciseId: exercise.id,
          },
          orderBy: { estimated1RM: 'desc' },
        });

        if (bestPR && user.profile && user.profile.bodyWeight && user.profile.birthDate && user.profile.sex) {
          // Calculate normalized strength score
          let score = calculateStrengthScore(
            bestPR.estimated1RM,
            user.profile.bodyWeight,
            user.profile.sex,
            calculateAge(user.profile.birthDate),
            exercise.strengthStandard || 1.0
          );
          
          // Apply recency decay based on days since PR
          const daysSincePR = Math.floor((Date.now() - bestPR.date.getTime()) / (1000 * 60 * 60 * 24));
          score = applyRecencyDecay(score, daysSincePR);
          
          // Weight the score by the exercise's contribution percentage to this muscle
          // e.g., Squat contributes 30% to glutes, so its score is weighted at 0.3
          const contribution = exercise.muscleContributions[0]?.contributionPercentage ?? 50;
          const weight = contribution / 100;
          
          // Track the highest contribution for scaling
          if (contribution > maxContribution) {
            maxContribution = contribution;
          }
          
          weightedScoreSum += score * weight;
          totalWeight += weight;
        }
      }

      // Calculate weighted average, then apply a scaling factor based on max contribution
      // This ensures secondary-only training (low contribution %) can't give high scores
      // Scale factor: reaches 1.0 only when you've trained an exercise with 60%+ contribution
      const scaleFactor = Math.min(1.0, maxContribution / 60);
      
      const rawStrengthScore = totalWeight > 0 ? (weightedScoreSum / totalWeight) * scaleFactor : 0;
      
      // Calculate weekly volume for this muscle group (hard sets only)
      const weeklyHardSets = await calculateWeeklyHardSetsForMuscle(user.id, mg.id);
      const volumeScore = calculateVolumeScore(weeklyHardSets, trainingAgeYears);
      
      // Combine strength (75%) and volume (25%) scores
      let combinedScore = calculateMuscleScore(rawStrengthScore, volumeScore);
      
      // Apply evidence gating - cap score based on training history
      // Use the window that gives the user the most benefit
      const effectiveSessions = Math.max(sessionsLast28Days, sessionsLast56Days);
      const effectiveWindow = sessionsLast56Days >= sessionsLast28Days ? 56 : 28;
      combinedScore = applyEvidenceGating(combinedScore, effectiveSessions, effectiveWindow);
      
      muscleScores[mg.name.toLowerCase()] = Math.min(100, Math.round(combinedScore));

      // Calculate recovery state
      const lastWorkoutWithMuscle = await db.session.findFirst({
        where: {
          userId: user.id,
          exercises: {
            some: {
              exercise: {
                muscleContributions: {
                  some: {
                    muscleGroupId: mg.id,
                    contributionPercentage: { gte: 30 },
                  },
                },
              },
            },
          },
        },
        orderBy: { startTime: 'desc' },
      });

      if (lastWorkoutWithMuscle) {
        const hoursSince = (Date.now() - lastWorkoutWithMuscle.startTime.getTime()) / (1000 * 60 * 60);
        const recoveryState = calculateRecoveryState(hoursSince, 7); // Default RPE 7
        muscleRecovery[mg.name.toLowerCase()] = recoveryState.fraction;
      } else {
        muscleRecovery[mg.name.toLowerCase()] = 1.0; // Fully recovered
      }
    }

    // Calculate overall rank (include all muscle groups, even with 0 scores)
    // This ensures training any muscle group always helps your overall rank
    const avgScore = Object.values(muscleScores).reduce((a, b) => a + b, 0) / 
      Math.max(1, Object.values(muscleScores).length);
    
    const overallRank = determineRank(avgScore);

    // Calculate progress within current rank
    const rankThresholds = scoringConfig.rankTiers;
    const rankTierKeys: RankTier[] = ['bronze', 'silver', 'gold', 'diamond', 'apex', 'mythic'];
    const currentTierIndex = rankTierKeys.indexOf(overallRank);
    const currentTier = rankThresholds[overallRank];
    const nextTierKey = rankTierKeys[currentTierIndex + 1];
    const nextTier = nextTierKey ? rankThresholds[nextTierKey] : null;
    
    let rankProgress = 0;
    if (currentTier && nextTier) {
      const range = nextTier.min - currentTier.min;
      rankProgress = ((avgScore - currentTier.min) / range) * 100;
    } else if (currentTier) {
      rankProgress = 100; // Max rank achieved
    }

    // Get volume data for the past week
    const weeklyVolume = await calculateWeeklyVolume(user.id);

    // Calculate current streak dynamically
    const currentStreak = await calculateCurrentStreak(user.id);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
      stats: {
        workoutsThisWeek,
        totalWorkouts,
        currentStreak,
        longestStreak: Math.max(user.longestStreak, currentStreak),
        weeklyVolume,
      },
      rank: {
        overall: overallRank,
        score: Math.floor(avgScore),
        progress: Math.round(rankProgress),
      },
      muscleScores,
      muscleRecovery,
      recentPRs: recentPRs.map((pr: { exercise: { name: string }; weight: number; reps: number; estimated1RM: number; date: Date }) => ({
        exercise: pr.exercise.name,
        weight: pr.weight,
        reps: pr.reps,
        estimated1RM: pr.estimated1RM,
        date: pr.date,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

async function calculateWeeklyVolume(userId: string): Promise<number> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const sessions = await db.session.findMany({
    where: {
      userId,
      startTime: { gte: weekStart },
    },
    include: {
      exercises: {
        include: {
          sets: true,
        },
      },
    },
  });

  let totalVolume = 0;
  for (const session of sessions) {
    for (const exerciseLog of session.exercises) {
      for (const set of exerciseLog.sets) {
        if (!set.isWarmup) {
          totalVolume += set.weight * set.reps;
        }
      }
    }
  }

  return totalVolume;
}

async function calculateCurrentStreak(userId: string): Promise<number> {
  // Get all sessions ordered by date descending
  const sessions = await db.session.findMany({
    where: { userId },
    orderBy: { startTime: 'desc' },
    select: { startTime: true },
  });

  if (sessions.length === 0) {
    return 0;
  }

  // Get unique workout dates (normalized to start of day)
  const workoutDates = new Set<string>();
  for (const session of sessions) {
    const date = new Date(session.startTime);
    date.setHours(0, 0, 0, 0);
    workoutDates.add(date.toISOString());
  }

  // Sort dates in descending order
  const sortedDates = Array.from(workoutDates)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  // Check if there's a workout today or yesterday (streak must be active)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecentWorkout = sortedDates[0];
  
  // If most recent workout is older than yesterday, streak is 0
  if (mostRecentWorkout.getTime() < yesterday.getTime()) {
    return 0;
  }

  // Count consecutive days
  let streak = 1;
  let currentDate = mostRecentWorkout;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    if (sortedDates[i].getTime() === prevDate.getTime()) {
      streak++;
      currentDate = sortedDates[i];
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate weekly hard sets for a specific muscle group
 * Only counts sets that qualify as "hard" (RPE >= 7 or not warmup)
 */
async function calculateWeeklyHardSetsForMuscle(userId: string, muscleGroupId: string): Promise<number> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // Get all sessions from the past week with exercises that target this muscle group
  const sessions = await db.session.findMany({
    where: {
      userId,
      startTime: { gte: weekStart },
    },
    include: {
      exercises: {
        include: {
          exercise: {
            include: {
              muscleContributions: {
                where: {
                  muscleGroupId: muscleGroupId,
                },
              },
            },
          },
          sets: true,
        },
      },
    },
  });

  let hardSets = 0;

  for (const session of sessions) {
    for (const exerciseLog of session.exercises) {
      // Check if this exercise contributes to the muscle group
      const contribution = exerciseLog.exercise.muscleContributions[0];
      if (!contribution || contribution.contributionPercentage < 10) continue;

      // Weight the sets by contribution percentage
      const contributionWeight = contribution.contributionPercentage / 100;

      for (const set of exerciseLog.sets) {
        // Skip warmup sets
        if (set.isWarmup) continue;
        
        // Count as hard set if RPE >= 7 or if no RPE specified (assume it's a working set)
        const isHardSet = !set.rpe || set.rpe >= 7;
        if (isHardSet) {
          // Weight the set by how much this exercise contributes to the muscle
          hardSets += contributionWeight;
        }
      }
    }
  }

  return Math.round(hardSets);
}

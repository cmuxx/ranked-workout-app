import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET - Fetch user's calendar/activity data
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;

    // Get all sessions for the specified period
    let startDate: Date;
    let endDate: Date;

    if (month !== null) {
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const sessions = await db.session.findMany({
      where: {
        userId: user.id,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        exercises: {
          include: {
            sets: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Group sessions by date and calculate daily stats
    const activityByDate: Record<string, {
      count: number;
      volume: number;
      duration: number;
      types: string[];
    }> = {};

    for (const s of sessions) {
      const dateKey = s.startTime.toISOString().split('T')[0];
      
      if (!activityByDate[dateKey]) {
        activityByDate[dateKey] = {
          count: 0,
          volume: 0,
          duration: 0,
          types: [],
        };
      }

      activityByDate[dateKey].count++;
      
      // Calculate volume
      let sessionVolume = 0;
      for (const exerciseLog of s.exercises) {
        for (const set of exerciseLog.sets) {
          if (!set.isWarmup) {
            sessionVolume += set.weight * set.reps;
          }
        }
      }
      activityByDate[dateKey].volume += sessionVolume;

      // Calculate duration
      if (s.endTime) {
        const duration = (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60);
        activityByDate[dateKey].duration += duration;
      }

      // Track workout types
      if (s.workoutType && !activityByDate[dateKey].types.includes(s.workoutType)) {
        activityByDate[dateKey].types.push(s.workoutType);
      }
    }

    // Calculate streak data using the same logic as stats API
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get sorted workout dates
    const workoutDates = Object.keys(activityByDate)
      .map(d => {
        const date = new Date(d);
        date.setHours(0, 0, 0, 0);
        return date;
      })
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let longestStreak = 0;

    if (workoutDates.length > 0) {
      const mostRecentWorkout = workoutDates[0];

      // Streak is only active if most recent workout is today or yesterday
      if (mostRecentWorkout.getTime() >= yesterday.getTime()) {
        currentStreak = 1;
        let currentDate = mostRecentWorkout;

        for (let i = 1; i < workoutDates.length; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);

          if (workoutDates[i].getTime() === prevDate.getTime()) {
            currentStreak++;
            currentDate = workoutDates[i];
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      let tempStreak = 1;
      for (let i = 1; i < workoutDates.length; i++) {
        const prevExpected = new Date(workoutDates[i - 1]);
        prevExpected.setDate(prevExpected.getDate() - 1);

        if (workoutDates[i].getTime() === prevExpected.getTime()) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    // Longest streak should include current streak if it's larger
    longestStreak = Math.max(longestStreak, currentStreak);

    // Calculate weekly stats
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisWeekKey = thisWeekStart.toISOString().split('T')[0];
    
    let thisWeekWorkouts = 0;
    let thisMonthWorkouts = 0;
    
    for (const [dateKey, data] of Object.entries(activityByDate)) {
      const date = new Date(dateKey);
      if (date >= thisWeekStart) {
        thisWeekWorkouts += data.count;
      }
      if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        thisMonthWorkouts += data.count;
      }
    }

    return NextResponse.json({
      activity: activityByDate,
      streaks: {
        current: currentStreak,
        longest: longestStreak,
      },
      summary: {
        thisWeek: thisWeekWorkouts,
        thisMonth: thisMonthWorkouts,
        total: sessions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

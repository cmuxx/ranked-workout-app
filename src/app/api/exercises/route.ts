import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const muscleGroup = searchParams.get('muscleGroup') || '';
    const category = searchParams.get('category') || '';

    const exercises = await db.exercise.findMany({
      where: {
        AND: [
          // Include global exercises (createdByUserId is null) and user's custom exercises
          {
            OR: [
              { createdByUserId: null },
              ...(userId ? [{ createdByUserId: userId }] : []),
            ],
          },
          query
            ? {
                OR: [
                  { name: { contains: query } },
                  { category: { contains: query } },
                ],
              }
            : {},
          muscleGroup
            ? {
                muscleContributions: {
                  some: {
                    muscleGroup: {
                      name: { contains: muscleGroup },
                    },
                  },
                },
              }
            : {},
          category ? { category: { equals: category } } : {},
        ],
      },
      include: {
        muscleContributions: {
          include: {
            muscleGroup: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

// POST - Create a custom exercise
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category, equipmentType, movementPattern, primaryMuscleGroupId } = body;

    // Validate required fields
    if (!name || !equipmentType) {
      return NextResponse.json(
        { error: 'Name and equipment type are required' },
        { status: 400 }
      );
    }

    // Check if exercise with same name already exists for this user
    const existingExercise = await db.exercise.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        OR: [
          { createdByUserId: session.user.id },
          { createdByUserId: null }, // Also check global exercises
        ],
      },
    });

    if (existingExercise) {
      return NextResponse.json(
        { error: 'An exercise with this name already exists' },
        { status: 409 }
      );
    }

    // Create the exercise
    const exercise = await db.exercise.create({
      data: {
        name,
        category: category || 'other',
        equipmentType,
        movementPattern: movementPattern || null,
        createdByUserId: session.user.id,
        strengthStandard: 1.0, // Default strength standard for custom exercises
      },
      include: {
        muscleContributions: {
          include: {
            muscleGroup: true,
          },
        },
      },
    });

    // If primary muscle group is specified, create the muscle contribution
    if (primaryMuscleGroupId) {
      await db.muscleContribution.create({
        data: {
          exerciseId: exercise.id,
          muscleGroupId: primaryMuscleGroupId,
          isPrimary: true,
          contributionPercentage: 100,
        },
      });

      // Refetch exercise with muscle contributions
      const updatedExercise = await db.exercise.findUnique({
        where: { id: exercise.id },
        include: {
          muscleContributions: {
            include: {
              muscleGroup: true,
            },
          },
        },
      });

      return NextResponse.json(updatedExercise, { status: 201 });
    }

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}

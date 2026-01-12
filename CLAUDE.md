# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gymenace is a research-backed fitness app that gamifies strength training using ranked muscle-group progression (Bronze → Silver → Gold → Diamond → Apex → Mythic). The scoring system is evidence-based, using peer-reviewed sports science research for 1RM estimation, allometric scaling, volume landmarks, and detraining models.

## Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000
npm run build            # Production build
npm run lint             # ESLint

# Database (SQLite + Prisma)
npm run db:generate      # Generate Prisma client (run after schema changes)
npm run db:push          # Push schema to database
npm run db:seed          # Seed with initial exercises and muscle groups
npm run db:studio        # Visual database browser
npm run db:migrate       # Run migrations in dev mode
```

**Initial setup:** `npm install && npm run db:generate && npm run db:push && npm run db:seed`

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router) with TypeScript strict mode
- **Database:** SQLite with Prisma ORM (client generated to `src/generated/prisma`)
- **Auth:** NextAuth.js v5 beta with credentials provider (JWT strategy)
- **UI:** Tailwind CSS 4 + shadcn/ui (Radix primitives)

### Key Directories
- `src/app/` - Next.js App Router (pages and API routes)
- `src/lib/scoring.ts` - Core scoring algorithm (~500 lines, heavily documented)
- `src/lib/auth.ts` - NextAuth configuration with Prisma adapter
- `src/lib/db.ts` - Prisma client singleton
- `src/components/ui/` - shadcn/ui components
- `config/scoring.json` - All scoring parameters (externalized, tunable)
- `prisma/schema.prisma` - Database schema
- `docs/research.md` - Evidence-based logic specification with formulas and citations

### Data Flow
1. **Auth:** NextAuth middleware protects `/dashboard/*` routes. Edge-safe config in `auth.config.ts`, full config in `auth.ts`
2. **API Routes:** All in `src/app/api/`. Pattern: authenticate via `auth()`, query via `db` singleton, return `NextResponse.json()`
3. **Scoring:** `scoring.ts` exports functions for 1RM estimation, percentile mapping, volume scoring, and rank calculation. Parameters loaded from `config/scoring.json`

### Database Models (Prisma)
- **User/Profile:** Authentication and body metrics (sex, weight, height, training age)
- **Exercise/MuscleGroup/MuscleContribution:** Exercise library with muscle targeting percentages
- **Session/ExerciseLog/SetLog:** Workout logging hierarchy
- **PRRecord:** Personal records for each exercise
- **MuscleGroupScoreSnapshot:** Weekly score history per muscle group

### Scoring System
The scoring combines multiple components (see `config/scoring.json` for all parameters):
- **Strength Score (75%):** Percentile-based using sex-specific standards
- **Volume Score (25%):** Weekly hard sets vs MEV/MAV/MRV landmarks
- **Recency Decay:** 28-day half-life - old PRs lose value
- **Evidence Gating:** Training history requirements unlock higher ranks

Key functions in `scoring.ts`:
- `estimate1RM()` - Brzycki/Epley 1RM calculation
- `allometricRelativeStrength()` - BW^0.67 scaling for fair comparison
- `getRankFromScore()` - Maps 0-100 score to rank tier

## Environment Variables

Required in `.env`:
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
```

## Patterns

- Server components by default; `'use client'` for interactive pages
- API routes authenticate with `const session = await auth()` then check `session?.user?.email`
- All scoring parameters externalized to `config/scoring.json` - modify there, not in code
- Path alias: `@/*` maps to `src/*`

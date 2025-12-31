## Plan: Gamified Workout Tracker Web App - SRS Document

This plan outlines the creation of a **Software Requirements Specification (SRS)** document for "GymRank" (working title) – a gamified workout tracking web app with competitive ranking tiers similar to esports games. The SRS will serve as your living blueprint for development, covering functional requirements, ranking algorithm logic, tech architecture, and UI/UX guidelines.

---

### Steps

1. **Create Project Structure & SRS Document**: Initialize a new repository with a `/docs` folder containing `SRS.md` as the primary specification document, plus `CONTRIBUTING.md` and `README.md` for open-source release.

2. **Define Ranking Algorithm Specification**: Document the strength scoring system using percentile-based tiers (Bronze 5th → Elite 95th), bodyweight-relative calculations, and age/gender coefficients based on Strength Level/Symmetric Strength research. Include rank decay rules for inactivity.

3. **Specify Core Functional Requirements**: Detail user flows for profile creation (body metrics input), workout logging (exercises, sets, reps, weight, RPE, dumbbell count), muscle group recovery tracking (48-96hr science-based windows), and streak/milestone systems.

4. **Define Data Models & Tech Stack**: Specify Prisma schema for Users, Workouts, Exercises, MuscleGroups, RankHistory, BodyWeightLogs. Confirm stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma + PostgreSQL.

5. **Outline UI/UX Requirements**: Specify mobile-first responsive design with anatomical body diagram (colored by rank per muscle group), calendar heatmap for streaks, rank progression badges (Bronze → Unreal), and recovery status indicators (red/yellow/green).

6. **Document API & Integration Specs**: Define REST API endpoints for workout CRUD, rank calculation triggers, and optional ExerciseDB integration for the 11,000+ exercise library with muscle group metadata.

---

### Further Considerations

1. **Ranking Tier Names**: Use gaming-inspired tiers (Bronze/Silver/Gold/Platinum/Diamond/Champion/Unreal) or fitness-inspired (Beginner/Novice/Intermediate/Advanced/Elite/Legendary)? *Recommend gaming-style for gamification appeal.*

2. **Rank Decay Rate**: How aggressively should ranks decay for inactivity? Options: 5% per week / 10% per 2 weeks / tiered decay (higher ranks decay faster). *Recommend tiered decay to keep casuals engaged.*

3. **1RM Estimation Formula**: Use Epley, Brzycki, or Wathan's formula for estimating one-rep max from working sets? *Research suggests Wathan's is most accurate across rep ranges.*

4. **Database Choice**: PostgreSQL (robust, scales well) vs SQLite (simpler for self-hosting)? *Recommend PostgreSQL with SQLite as optional for single-user deployments.*

5. **Exercise Library Source**: Build custom database vs integrate ExerciseDB API (11k exercises)? *Recommend seeding from ExerciseDB with user-addable custom exercises.*

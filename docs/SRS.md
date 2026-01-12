# Software Requirements Specification (SRS)
## Project: Gymenace (Web App)

Version: 0.1  
Status: Draft  
License intent: Open source (MIT recommended)

---

## 1. Purpose
This document defines the functional and non-functional requirements for a web application that gamifies gym progress using ranked muscle-group scores, an overall rank, streaks, milestones, strength scoring, and recovery readiness.

The goal is to increase consistency and smarter training through simple logging, visual progress feedback, and rank progression with fair normalization.

---

## 2. Scope
### In scope (MVP)
- User accounts and profiles (body metrics + training background)
- Exercise library with muscle group mappings
- Workout logging (sessions, exercises, sets)
- Strength score and rank calculation (per muscle group and overall)
- Recovery readiness states per muscle group
- Streak tracking (calendar heatmap)
- PR tracking
- Basic insights (volume trends, recent progress)
- Anatomy-style visualization (muscle groups colored by rank)

### Out of scope (initially)
- Social leaderboards and competitive matchmaking
- Wearables integration (HRV, sleep, etc.)
- Automatic import from other apps
- Full native iOS/Android apps

---

## 3. Users and Stakeholders
### Primary users
- General gym lifters focused on strength and hypertrophy
- Users who want accountability and progress feedback

### Stakeholders
- Open-source contributors
- Self-hosters (home server deployments)
- Future maintainers

---

## 4. Definitions
- **Set**: A single performance entry with reps, load, and optional RPE/RIR.
- **Session**: A workout day containing multiple exercises and sets.
- **Muscle Group**: A category (chest, back, quads, hamstrings, shoulders, biceps, triceps, calves, glutes, core).
- **Strength Score**: Numeric score derived from logged performance normalized to user metrics.
- **Rank**: A tiered label (Bronze, Silver, Gold, Diamond, Champion, Elite, Unreal) derived from numeric rating bands.
- **Recovery Readiness**: A per-muscle state derived from recent training stress and time since last stimulus.

---

## 5. Assumptions and Constraints
- The app is not medical advice and does not diagnose or treat health conditions.
- Users self-report performance and may log inaccurately.
- Scoring should be robust to imperfect data, missing RPE, and varying exercise selection.
- The MVP should run locally via `npm run dev` without requiring Docker.

---

## 6. Functional Requirements

### 6.1 Authentication and Accounts
FR-1: Users can create an account (email + password or OAuth).  
FR-2: Users can sign in/out and reset password.  
FR-3: Users can delete their account and data.

### 6.2 Profile and Body Metrics
FR-4: Users can create and edit a profile including:
- Age, sex, height, weight
- Training age (years lifting)
- Preferred units (lb/kg)
FR-5: Users can log bodyweight entries over time.
FR-6: App displays weight trends and summary stats (min, max, weekly change).

### 6.3 Exercise Library
FR-7: App provides an exercise library with:
- Name
- Equipment type (barbell, dumbbell, machine, cable, bodyweight)
- Primary muscle group and optional secondary muscle groups
- Movement pattern tags (push, pull, squat, hinge, carry, isolation)
FR-8: Users can search exercises by name.
FR-9: Admin or maintainers can add/edit exercises (or PR-based workflow via GitHub).

### 6.4 Workout Logging
FR-10: Users can create a session with date and workout type (push, pull, legs, upper, lower, full body, custom).
FR-11: Users can add exercises to a session.
FR-12: For each exercise, users can add sets with:
- Reps (integer)
- Load (number)
- Optional RPE (1-10) or RIR (0-10)
- Optional rest timer value
FR-13: Dumbbell logging supports mode:
- Single dumbbell
- Two dumbbells (paired)
FR-14: Users can edit or delete sessions, exercises, and sets.

### 6.5 PR Tracking
FR-15: App detects and stores PRs for:
- Estimated 1RM PR (per exercise)
- Heaviest load PR
- Rep PR at given load (optional)
FR-16: PR history is visible on exercise detail pages.

### 6.6 Strength Score and Ranking
FR-17: App computes a per-set performance metric (example: estimated 1RM or standardized intensity).
FR-18: App aggregates sets into per-exercise session score.
FR-19: App aggregates exercise scores into muscle-group score using weighting.
FR-20: App computes an overall score from muscle-group scores.
FR-21: App maps numeric scores into rank tiers (Bronze to Unreal).
FR-22: App displays ranks for each muscle group and overall.

### 6.7 Rank Progression and Decay
FR-23: User rank increases when progress is detected (strength score trends upward).
FR-24: Rank decays with inactivity (no training stimulus for a muscle group).
FR-25: Decay is per-muscle-group and affects overall rank.

### 6.8 Recovery Readiness
FR-26: App estimates per-muscle recovery fraction based on:
- Recent training stress for that muscle
- Time since last stimulus
- Optional modifiers (sleep or subjective readiness later)
FR-27: App displays recovery states:
- Need Recovery (below threshold)
- Recovering (mid range)
- Ready (above threshold)
FR-28: App shows last trained date and projected ready time (estimated).

### 6.9 Streaks and Calendar Heatmap
FR-29: App tracks gym attendance by session date.
FR-30: App shows a calendar heatmap and current streak.
FR-31: Missed days break the streak; streak rules must be configurable (for example rest days allowed).

### 6.10 Anatomy Visualization
FR-32: App displays a body diagram with muscle groups colored by rank tier.
FR-33: Tapping a muscle group shows:
- Rank tier
- Recent score trend
- Recovery state
- Recent volume summary

### 6.11 Insights
FR-34: App provides weekly insights including:
- Volume trends by muscle group
- Recovery patterns
- PRs achieved
- Areas neglected (low frequency)
FR-35: App flags sudden spikes in volume or intensity as warnings.

---

## 7. Non-Functional Requirements

### 7.1 Performance
NFR-1: App should load primary dashboard in under 2 seconds on a typical home network.
NFR-2: Queries for user sessions should be paginated and indexed.

### 7.2 Reliability
NFR-3: No data loss on refresh; autosave is optional but recommended.
NFR-4: Database migrations must be reproducible.

### 7.3 Security and Privacy
NFR-5: Passwords must be hashed using industry standard methods.
NFR-6: Users can export their data (JSON).
NFR-7: Minimal PII is stored. No medical data is required for MVP.

### 7.4 Accessibility
NFR-8: UI must be usable with keyboard navigation.
NFR-9: Color-based rank indicators must have text labels and accessible contrast.

### 7.5 Responsiveness
NFR-10: UI supports mobile, tablet, desktop breakpoints with usable logging flow on phone.

### 7.6 Maintainability
NFR-11: Strong typing (TypeScript) and consistent lint/format rules.
NFR-12: Clear separation between scoring logic and UI components.

---

## 8. Data Requirements (High Level)
Entities:
- User
- Profile (metrics)
- BodyweightEntry
- Exercise
- Session
- ExerciseLog
- SetLog
- MuscleGroupScoreSnapshot
- RecoveryStateSnapshot
- PRRecord

Key relationships:
- User has many sessions
- Session has many exercises
- ExerciseLog has many sets
- Exercise maps to muscle groups

---

## 9. Algorithm Requirements (MVP-level)
AR-1: Scoring must work without RPE, using reps and load only.  
AR-2: If RPE/RIR is present, it may refine intensity estimation.  
AR-3: Provide defaults for:
- rank tier thresholds
- decay rate ranges
- recovery state thresholds  
AR-4: All scoring and recovery parameters must be configurable via a JSON config file.

---

## 10. Future Enhancements
- Personalized calibration of recovery model per user
- User-defined programs and planned workouts
- Import formats (CSV, common app exports)
- Social comparisons (opt-in)
- Native app client

---

## 11. Acceptance Criteria (MVP)
- User can create profile, log a session, and see:
  - muscle group ranks
  - overall rank
  - recovery readiness states
  - streak heatmap
  - PRs
- All views are usable on mobile and desktop.
- Scoring and recovery logic run deterministically with the same input data.

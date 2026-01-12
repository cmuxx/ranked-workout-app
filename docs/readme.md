# Gymenace
A self-hostable, open-source web app that gamifies strength and hypertrophy training using ranked muscle-group progression, recovery readiness, streaks, PR tracking, and insights.

This is built to feel like a ranked mode in games (Bronze → Unreal), but for the gym.

## Disclaimer
This app is for educational and motivational purposes only. It is not medical advice. If you have injuries or medical conditions, consult a qualified professional.

---

## Features (Planned MVP)
- Accounts + user profiles (age, sex, height, weight, training age)
- Workout logging (sessions, exercises, sets, reps, load, optional RPE/RIR)
- Strength scoring (per exercise, per muscle group, overall)
- Rank tiers (Bronze, Silver, Gold, Diamond, Champion, Elite, Unreal)
- Rank progression for consistency and performance improvement
- Rank decay with inactivity (per muscle group)
- Recovery readiness states per muscle group (Need Recovery, Recovering, Ready)
- PR tracking (estimated 1RM PR, load PR)
- Streaks + calendar heatmap
- Muscle-group anatomy visualization (color-coded by rank)
- Weekly insights (volume trends, neglected muscle groups, PR recap)

---

## Tech Stack (intended)
- Next.js + TypeScript
- Tailwind CSS
- Database: PostgreSQL or SQLite
- Prisma ORM

---

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm
- A database (Postgres recommended for self-host)

### Local development
1. Install dependencies:
   - `npm install`

2. Create environment file:
   - Copy `.env.example` to `.env`

3. Run DB migrations:
   - `npx prisma migrate dev`

4. Start dev server:
   - `npm run dev`

Open:
- `http://localhost:3000`

### Scripts
- `npm run dev` Start development server
- `npm run build` Production build
- `npm run start` Run production server
- `npm run lint` Lint

---

## Configuration
Scoring, rank thresholds, decay, and recovery parameters should be configurable.
Planned approach:
- `config/scoring.json` for global defaults
- Optional per-user tuning later

---

## Roadmap (High Level)
- MVP logging flow + profile
- Strength score + ranks
- Recovery readiness + streak heatmap
- Anatomy visualization
- Insights dashboard
- Self-host docs and example deployment

---

## Contributing
See `CONTRIBUTING.md`.

---

## License
MIT (recommended). Final license will be confirmed in the repo.

---

## Project Philosophy
- Keep the logging flow simple
- Make progress visible and motivating
- Use sensible, transparent scoring logic
- Prefer defaults that work for most users, then allow calibration

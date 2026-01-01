# Ranked Gym Progress

> **⚠️ Work In Progress** — This project is under active development and not yet ready for public use. Feel free to explore the codebase and research, but expect breaking changes.

A research-backed web app that gamifies strength and hypertrophy training using ranked muscle-group progression. Think ranked mode in competitive games (Bronze → Mythic), but for the gym.

<img width="1113" height="1074" alt="Dashboard showing muscle group ranks and anatomy visualization" src="https://github.com/user-attachments/assets/6eab5df9-80fc-4008-a8f7-e8e5c3750b11" />

---

## 🔬 Research-Backed Scoring System

What sets this project apart is its **evidence-based approach** to scoring and ranking. Instead of arbitrary point systems, every calculation is grounded in peer-reviewed sports science research.

### Scientific Foundation

The scoring algorithm is built on established research including:

- **Allometric Scaling** — Strength comparisons use the scientifically-validated BW^0.67 exponent for fair cross-body-weight rankings ([Folland & Cauley 2008](https://pubmed.ncbi.nlm.nih.gov/18465186/))
- **1RM Estimation** — Brzycki and Epley equations validated across multiple studies with known accuracy ranges
- **Volume-Response Research** — Hard set counting and volume landmarks (MEV, MAV, MRV) based on Schoenfeld's dose-response meta-analyses
- **Detraining Kinetics** — Rank decay models derived from Bosquet/Gentil's meta-analysis of 103 studies on training cessation
- **Recovery Modeling** — Per-muscle recovery windows based on neuromuscular recovery literature with evidence-backed τ constants
- **Percentile-Based Ranking** — Sex-specific strength standards mapped to population percentiles, where 50th percentile = Silver tier

### Key Research Citations

| Component | Research Base |
|-----------|---------------|
| Relative Strength | Allometric scaling (BW^0.67) — Folland 2008, validated exponent ~0.66-0.68 |
| Volume & Hypertrophy | Schoenfeld et al. 2016/2017 dose-response papers |
| Detraining | Bosquet/Gentil 2013 meta-analysis (103 studies) |
| Recovery Windows | Dupuy et al. 2018, neuromuscular recovery literature |
| Session Load | Foster's session-RPE methodology (Haddad 2017 review) |

📄 **Full research documentation:** See [docs/research.md](docs/research.md) for the complete evidence-based logic specification with formulas, parameters, and citations.

---

## ✨ Current Features

### Implemented & Working
- ✅ User authentication (email/password registration & login)
- ✅ User profiles with body metrics (age, sex, height, weight, training age)
- ✅ Workout session logging with exercises, sets, reps, and load
- ✅ **Percentile-based strength scoring** — Maps your lifts to population percentiles
- ✅ **Multi-component scoring** — 75% strength + 25% volume for balanced assessment
- ✅ **Evidence gating** — Requires training history before unlocking higher ranks
- ✅ **Recency decay** — 28-day half-life rewards consistent training
- ✅ Rank tiers: Bronze → Silver → Gold → Diamond → Apex → Mythic
- ✅ Per-muscle-group ranking with overall composite score
- ✅ PR tracking (estimated 1RM, actual load PRs)
- ✅ Anatomy visualization showing muscle groups colored by rank
- ✅ Calendar heatmap with streak tracking
- ✅ Dark/Light mode support
- ✅ Data export (JSON)
- ✅ Account deletion

### In Development
- 🔄 Exercise library & muscle group mapping refinement
- 🔄 Muscle visualization model improvements
- 🔄 Milestones & badges system
- 🔄 Profile setup flow validation

---

## 🎯 Scoring Philosophy

The ranking system is designed to be **fair, transparent, and motivating**:

| Percentile | Rank | Who This Represents |
|------------|------|---------------------|
| 0-30th | Bronze | Beginning lifters |
| 30-75th | Silver | Average gym-goers |
| 75-90th | Gold | Dedicated trainers |
| 90-97th | Diamond | Seriously strong |
| 97-99th | Apex | Elite strength |
| 99th+ | Mythic | Exceptional outliers |

**Average = Silver.** Unlike inflated ranking systems where everyone is "Diamond," hitting Silver means you're genuinely at the 50th percentile — stronger than half the lifting population.

### Scoring Components

```
Final Score = (Strength Score × 0.75) + (Volume Score × 0.25)
```

- **Strength Score**: Your best lifts mapped to sex-specific percentile standards
- **Volume Score**: Weekly hard sets compared to research-based volume landmarks
- **Recency Decay**: PRs fade over time (28-day half-life) — stay consistent
- **Evidence Gating**: Can't reach Gold without 3+ sessions, Diamond without 6+, etc.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **Auth**: NextAuth.js with credentials provider

---

## 📁 Project Structure

```
├── config/
│   └── scoring.json       # All scoring parameters (configurable)
├── docs/
│   ├── research.md        # Full evidence-based logic spec
│   ├── SRS.md             # Software requirements specification
│   └── plan.md            # Development planning notes
├── prisma/
│   └── schema.prisma      # Database schema
└── src/
    ├── app/               # Next.js App Router pages
    ├── components/        # React components
    └── lib/
        └── scoring.ts     # Scoring algorithm implementation
```

---

## 📊 Configuration

All scoring parameters are externalized in [`config/scoring.json`](config/scoring.json):

- Rank tier thresholds and colors
- Percentile-to-score mapping bands
- Sex-specific strength standards
- Volume landmarks (MEV, MAV, MRV) by training age
- Recovery time constants and multipliers
- Decay rates for detraining
- Evidence gating requirements

This makes the system fully transparent and tunable.

---

## 🗺 Roadmap

### Near Term
- [ ] Validate and expand exercise library
- [ ] Improve muscle anatomy visualization
- [ ] Implement milestones & badges
- [ ] Test and fix profile setup flow
- [ ] Recovery readiness indicators

### Future
- [ ] Weekly insights dashboard
- [ ] Volume trend visualizations
- [ ] Import from other fitness apps
- [ ] Progressive Web App (PWA) support
- [ ] Self-hosting documentation

---

## ⚠️ Disclaimer

This app is for **educational and motivational purposes only**. It is not medical advice. The scoring system provides estimates based on population averages — individual results vary. If you have injuries or medical conditions, consult a qualified professional.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

This project stands on the shoulders of excellent sports science research. Special thanks to the researchers whose work made evidence-based scoring possible:

- Schoenfeld et al. for volume-hypertrophy research
- Bosquet & Gentil for detraining meta-analyses
- Foster et al. for session-RPE methodology
- The broader strength science community

---

<p align="center">
  <em>Built with 💪 and 📊 science</em>
</p>

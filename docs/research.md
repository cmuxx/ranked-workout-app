Below is a **single, self-contained markdown document** you can give directly to your dev team. It includes:

- Evidence-based logic for: strength, scoring, volume, recovery, detraining, safety
- Concrete formulas and parameters
- Key citations with DOI/PMID

***


# Evidence-Based Logic Spec for Gym Gamification App
Version: 1.0  
Scope: General gym population (18–70+, novice → advanced)  
Use: Implementation blueprint for ranking, scoring, recovery, and detraining

---

## 0. Notation & Conventions

- BW = body mass (kg)  
- 1RM = one-repetition maximum (kg)  
- RPE = Rating of Perceived Exertion (0–10 scale)  
- RIR = Reps in Reserve  
- τ = time constant (hours or days)  
- φ(t) = fraction of baseline (0–1) at time t  

All formulas are approximations; some multipliers are **heuristics** with ranges.  
Heuristic items are explicitly labeled.

---

## 1. Strength Quantification (Per-Set, Per-Exercise)

### 1.1 1RM Estimation from Reps

Use established equations for sets taken near failure (RIR ≤ 3).

**Brzycki equation** (good for 1–10 reps):

\[
1RM_{Brzycki} = \frac{Load}{1.0278 - 0.0278 \times reps}
\]

- Accuracy: ~±3–5% for 3–5 reps, error increases >10 reps.[web:24][web:21]  
- DOIs/PMID: Validation summarized in Gentil 2013 meta-analysis.[web:213]

**Epley equation** (similar range):

\[
1RM_{Epley} = Load \times (1 + 0.0333 \times reps)
\]

- Similar accuracy; slightly different bias profile.[web:24]

**Implementation:**

```python
def brzycki_1rm(load_kg: float, reps: int) -> float:
    return load_kg / (1.0278 - 0.0278 * reps)

def epley_1rm(load_kg: float, reps: int) -> float:
    return load_kg * (1 + 0.0333 * reps)
```

**Recommendation:**

- Default: Brzycki for reps 1–10.
- If reps >10, display: “1RM estimate low confidence”.


### 1.2 RPE/RIR-Based 1RM Estimation

Meta-analyses and validation work show good correlations between RIR-based RPE and %1RM in trained lifters.[web:192][web:190]

Approximate **RIR→%1RM** mapping (trained):


| RIR | Approx %1RM | Notes |
| :-- | :-- | :-- |
| 0 | ~100% | Failure |
| 1 | ~96–98% | RPE ≈ 9.5 |
| 2 | ~92–94% | RPE ≈ 9 |
| 3 | ~88–90% | RPE ≈ 8 |
| 4 | ~84–86% | RPE ≈ 7 |

Heuristic 1RM from submax:

$$
1RM_{RIR} \approx \frac{Load}{\%1RM(RIR)}
$$

Implementation sketch:

```python
def rir_to_percent_1rm(rir: int) -> float:
    table = {0: 1.00, 1: 0.97, 2: 0.93, 3: 0.89, 4: 0.85}
    return table.get(rir, 0.85)

def rir_based_1rm(load_kg: float, rir: int) -> float:
    pct = rir_to_percent_1rm(rir)
    return load_kg / pct
```

Evidence: RIR-based prediction shows good convergent validity (r ≈ 0.8–0.9) but individual error can be 5–10%, especially in novices.[web:190][web:192]

---

## 2. Relative Strength \& Scaling (for Fair Rankings)

### 2.1 Allometric Scaling (Primary Method)

Strength scales with cross-sectional area (~BW^0.67). Allometric scaling is more valid than simple 1RM/BW.[web:10][web:25][web:194]

**Formula (general):**

$$
RelStrength = \frac{1RM}{BW^{0.67}}
$$

- Strong evidence for exponent ~0.66–0.68 for force.[web:10][web:194]
- For simplicity, use 0.67 for all lifts.

Implementation:

```python
def allometric_relative_strength(one_rm_kg: float, bw_kg: float, exponent: float = 0.67) -> float:
    return one_rm_kg / (bw_kg ** exponent)
```


### 2.2 Age Adjustment (for Cross-Age Comparison)

Strength peaks around 25–35, declines ≈3–8% per decade after ~45.[web:91][web:222]

Use age factor for *comparison only* (don’t show as “loss” to user):


| Age (years) | AgeFactor (for comparison) |
| :-- | :-- |
| 18–24 | 0.90 |
| 25–35 | 1.00 |
| 36–45 | 0.98 |
| 46–55 | 0.90 |
| 56–65 | 0.80 |
| 65+ | 0.65 |

Implementation:

```python
def age_adjustment_factor(age: int) -> float:
    table = [
        ((18,24), 0.90),
        ((25,35), 1.00),
        ((36,45), 0.98),
        ((46,55), 0.90),
        ((56,65), 0.80),
        ((66,150), 0.65),
    ]
    for (lo, hi), f in table:
        if lo <= age <= hi:
            return f
    return 0.65
```

Use:

$$
AgeAdjRelStrength = RelStrength \times AgeFactor
$$

### 2.3 Sex Differences (Norms, Not Penalties)

Meta-analyses show **similar hypertrophy and relative strength gains** in men and women when training is matched.[web:55][web:49]

- Women have lower absolute baseline upper-body strength.
- Relative gains are similar/slightly larger, but due to lower starting point.

Implementation:

- Maintain **sex-specific normative tables** for percentile ranks.
- Do **not** hard-penalize by sex; compare within-sex percentiles.

---

## 3. Strength Scores \& Muscle-Group Scores

### 3.1 Per-Exercise Strength Score

Steps per log entry:

1. Estimate 1RM from the top set (Brzycki or RIR-based).
2. Compute allometric relative strength.
3. Compare to exercise-specific normative mean for that sex/age/training level.
4. Map ratio → 0–100 score.

Let:

$$
RS = \frac{1RM}{BW^{0.67}}, \quad RS_{norm} = \text{normative mean}
$$

$$
ratio = \frac{RS}{RS_{norm}}
$$

Simple scoring:

$$
Score_{exercise} = \max(0, \min(100, 50 \times ratio + 25))
$$

- ratio = 1.0 → score ≈ 75
- ratio = 0.5 → score ≈ 50
- ratio = 2.0 → score capped at 100

Implementation:

```python
def exercise_strength_score(rel_strength: float, rel_norm: float) -> float:
    ratio = rel_strength / rel_norm if rel_norm > 0 else 0
    score = 50 * ratio + 25
    return max(0, min(100, score))
```

Norms can be seeded from large public datasets (e.g., strength-standard tables) but must be treated as **non-academic context**, not primary evidence.

### 3.2 Muscle-Group Score (Volume-Weighted)

Each exercise maps to one or more muscle groups with fractional contributions (e.g., bench: chest 0.6, triceps 0.3, shoulders 0.1).

For a muscle m over a week:

- For each exercise i involving m:
    - volume weight:

$$
w_i = Sets_i \times Reps_i \times \%1RM_i
$$

or, if %1RM unknown, approximate via RPE (e.g., RPE 8 ≈ 80%).

Muscle-group score:

$$
Score_m = \frac{\sum_i Score_{exercise,i} \cdot w_i}{\sum_i w_i}
$$

Implementation:

```python
def muscle_group_score(ex_scores: list[float], vol_weights: list[float]) -> float:
    if not ex_scores or sum(vol_weights) == 0:
        return 0.0
    return sum(s*w for s, w in zip(ex_scores, vol_weights)) / sum(vol_weights)
```


### 3.3 Overall Strength Score

Let S_m be each muscle-group score.

Base:

$$
Base = \frac{1}{N} \sum_m S_m
$$

Add bonuses/penalties:

- ConsistencyBonus: based on % of weeks meeting minimum volume (MEV).
- ProgressionBonus: based on recent % increase in estimated 1RM/volume.
- RecoveryPenalty: if model flags many muscle groups “Need Recovery”.

Example:

$$
Overall = Base + ConsistencyBonus + ProgressionBonus - RecoveryPenalty
$$

Cap to 0–100.

---

## 4. Training Load, Volume \& Progression

Meta-analyses: Hypertrophy is primarily driven by **hard sets per muscle per week**, with a dose–response up to ~15–20 sets.[web:54][web:193]

### 4.1 Definitions

**Volume load (VL):**

$$
VL = Sets \times Reps \times Load_{kg}
$$

**Hard set (per Schoenfeld et al.):**[web:54][web:193]

- Set with:
    - RPE ≥ 7 (≈ RIR ≤ 3), or
    - ≥70% 1RM

**Session-RPE Load (Foster):**[web:126][web:123]

$$
Load_{session} = Duration_{min} \times RPE_{session}
$$

Used for global fatigue/overuse risk.

### 4.2 Volume Landmarks (per muscle per week)

Synthesized from Schoenfeld dose–response work \& newer meta-analyses.[web:54][web:193]


| Training Age | MEV (min effective) | MAV (most adaptive) | MRV (upper recoverable) |
| :-- | :-- | :-- | :-- |
| Novice (<1y) | ~6–8 hard sets | ~10–15 | ~15–20 |
| Intermediate (1–3y) | ~10–12 | ~15–20 | ~20–25 |
| Advanced (3y+) | ~12–15 | ~20–30 | ~25–40 |

Implementation (defaults; user-tunable):

```python
VOLUME_LANDMARKS = {
    "novice": {"MEV": 8, "MAV": (12, 16), "MRV": 20},
    "intermediate": {"MEV": 10, "MAV": (15, 20), "MRV": 25},
    "advanced": {"MEV": 12, "MAV": (20, 30), "MRV": 35},
}
```


### 4.3 Progression Rules

- Weekly volume change: target **+5–10%** per 4 weeks; avoid >20% jumps (injury association).[web:92]
- Maintain most sets in **RPE 7–8** (RIR 2–3); RPE 9–10 used sparingly.[web:170][web:220]

---

## 5. Recovery Readiness Model (Per Muscle Group)

### 5.1 Core Idea

Recovery modeled as **exponential decay** of fatigue:

$$
RecoveryFraction(t) = 1 - e^{-t / \tau_{adj}}
$$

Where τ_adj is a time constant adjusted for:

- Session RPE
- Exercise type (compound vs isolation)
- Eccentric emphasis
- Training age
- Sleep (heuristic)

States:

- RecoveryFraction < 0.50 → **Need Recovery**
- 0.50–0.79 → **Recovering**
- ≥0.80 → **Ready**


### 5.2 Base τ from RPE (Evidence-Supported Ranges)

From neuromuscular recovery studies and expert consensus.[web:32][web:35][web:56][web:160]

Use:


| Session RPE | Base τ (hours) | Interpretation |
| :-- | :-- | :-- |
| 5–6 | 12 | Light |
| 7 | 24 | Moderate |
| 8 | 36 | Hard |
| 9 | 48 | Very hard |
| 10 | 72 | Maximal / testing |

These values are consistent with typical 24–72 h recovery windows seen in resistance exercise literature.[web:32][web:35][web:56]

### 5.3 Multipliers (Some Heuristic, Some Supported)

**Exercise type:**

- compound: ×1.2 (multi-joint → more systemic fatigue)[web:35][web:50]
- isolation: ×1.0
Evidence: indirect; treat as **moderate evidence**.

**Eccentric-heavy (slow eccentrics, overload):**

- ×1.3 (range 1.2–1.5)[web:56][web:41]
Evidence: eccentric protocols show longer DOMS and force deficit; coefficient is **heuristic within that range**.

**Training age:**

- <1 year: ×1.3 (slower recovery)
- 1–3 years: ×1.0
- 3–5 years: ×0.85
- 5+ years: ×0.75
Evidence: untrained lifters show slower neural recovery, trained recover faster; exact multipliers **heuristic**.[web:52][web:171]

**Sleep (heuristic):**
Based on sleep-loss meta-analyses showing ~5–10% impairment in performance next day; no direct τ data.[web:181][web:180]

- ≥8h: ×0.92
- 7–8h: ×0.95
- 6–7h: ×1.0
- 5–6h: ×1.15
- <5h: ×1.25

Treat as **heuristic** and user-calibrated.

### 5.4 Recovery Equation (Implementation)

```python
import math

def adjusted_tau_hours(
    session_rpe: float,
    exercise_type: str,      # "compound" or "isolation"
    eccentric_heavy: bool,
    training_age_years: float,
    sleep_hours: float
) -> float:
    # 1) Base τ from RPE
    base_map = {5:12, 6:12, 7:24, 8:36, 9:48, 10:72}
    base_tau = base_map.get(int(round(session_rpe)), 24)

    # 2) Exercise type multiplier (moderate evidence)
    ex_mult = 1.2 if exercise_type == "compound" else 1.0

    # 3) Eccentric multiplier (range 1.2–1.5, default 1.3)
    ecc_mult = 1.3 if eccentric_heavy else 1.0

    # 4) Training age multiplier (heuristic)
    if training_age_years < 1:
        ta_mult = 1.3
    elif training_age_years < 3:
        ta_mult = 1.0
    elif training_age_years < 5:
        ta_mult = 0.85
    else:
        ta_mult = 0.75

    # 5) Sleep multiplier (heuristic)
    if sleep_hours >= 8:
        s_mult = 0.92
    elif sleep_hours >= 7:
        s_mult = 0.95
    elif sleep_hours >= 6:
        s_mult = 1.0
    elif sleep_hours >= 5:
        s_mult = 1.15
    else:
        s_mult = 1.25

    return base_tau * ex_mult * ecc_mult * ta_mult * s_mult


def recovery_status(
    hours_since_session: float,
    **kwargs
) -> dict:
    tau = adjusted_tau_hours(**kwargs)
    frac = 1.0 - math.exp(-hours_since_session / tau)
    frac = max(0.0, min(1.0, frac))

    if frac < 0.50:
        state = "Need Recovery"
    elif frac < 0.80:
        state = "Recovering"
    else:
        state = "Ready"

    # time until 80% recovery (solve for t where frac = 0.8)
    target = 0.8
    hours_to_80 = max(0.0, tau * (-math.log(1 - target)) - hours_since_session)

    return {
        "recovery_fraction": round(frac, 2),
        "state": state,
        "hours_to_80pct": round(hours_to_80, 1),
        "tau_hours": round(tau, 1),
    }
```


### 5.5 Per-User Calibration (Strongly Recommended)

After user has ≥10 logged sessions:

1. Ask per muscle group:
“After a typical hard session (RPE ~8) for [muscle], when do you *actually* feel ready to push heavy again?”
Options: 24, 36, 48, 72 h, etc.
2. Compute:

$$
Correction = \frac{UserObserved\tau}{ModelPredicted\tau}
$$

3. Apply correction (only to heuristic multipliers):
```python
user_corr = user_tau_observed / model_tau
# For safety, dampen:
user_corr = user_corr ** 0.3  # soft adjustment
```

Store per-user correction factor and multiply τ by this in future.

---

## 6. Detraining \& Rank Decay

### 6.1 Evidence Summary

Meta-analysis (Bosquet/Gentil 2013):[web:213][web:155]

- 103 studies on training cessation and muscular performance.
- RT cessation decreases maximal strength; magnitude depends on age, training status, and duration.

Key points:

- Short-term (<4 weeks): strength generally **well maintained**; small decreases.
- Long-term (>4 weeks): progressive losses; older and inactive lose more.[web:213]

Older adults meta-analysis (Grosset 2022):[web:77][web:153]

- 12–24 weeks detraining: small–moderate muscle size reduction (d ≈ −0.60; wide CI).
- 31–52 weeks: large decrease (d ≈ −1.11).


### 6.2 Practical Ranges (1RM strength)

For **trained adults (18–50)**:

- ~1 week: ~0–10% loss (mostly neural \& form).[web:213]
- 2–4 weeks: ~5–20% loss.[web:213][web:168]
- 6–12 weeks: ~15–30% loss; larger in older/less active.[web:213][web:77][web:168]

For **older adults (65+)**:

- 2–4 weeks: ~10–25% loss.[web:77][web:213]
- 12–24 weeks: ~20–40% loss in muscle size and strength.[web:77][web:211]


### 6.3 Power-Law Decay Model (Recommended)

We want φ(t) = fraction of performance retained after t days of no training.
Constraints:

- φ(0) = 1
- φ decreases faster early, then flattens (muscle memory)
- φ never goes below ~0.1 (retain some advantage)

Use:

$$
\phi(t) = 1 - \left(\frac{t}{\tau}\right)^{\alpha}, \quad 0 \le t \le 2\tau
$$

$$
\phi(t) = 0.1 \quad \text{for } t > 2\tau
$$

Where:

- α ≈ 0.6 (shape: steep early then flatten)
- τ (days) depends on age \& training status:

Example defaults (heuristic but matched to meta ranges):


| Cohort | τ_half (days approx) |
| :-- | :-- |
| Young novice | 18 |
| Young trained | 42 |
| Older novice | 15 |
| Older trained | 28 |

Implementation:

```python
def detraining_tau_half(age: int, training_age_years: float) -> float:
    if age >= 65:
        if training_age_years < 1:
            return 15
        elif training_age_years < 3:
            return 22
        else:
            return 28
    elif age >= 45:
        if training_age_years < 1:
            return 18
        elif training_age_years < 3:
            return 30
        else:
            return 36
    else:  # <45
        if training_age_years < 1:
            return 18
        elif training_age_years < 3:
            return 30
        else:
            return 42

def detraining_decay_factor(days_inactive: int, age: int, training_age_years: float, alpha: float = 0.6) -> float:
    tau = detraining_tau_half(age, training_age_years)
    if days_inactive <= 2 * tau:
        phi = 1.0 - (days_inactive / tau) ** alpha
    else:
        phi = 0.1
    return max(0.1, min(1.0, phi))
```

Apply to stored strength-based score:

$$
Score_{detrained} = Score_{last\_active} \times \phi(days\_inactive)
$$

### 6.4 Muscle Memory on Retraining (Qualitative)

Evidence: Re-training after detraining restores strength **faster** than initial training (neural and cellular “memory”).[web:213][web:216][web:212]

Implementation idea (optional):

- After >14 days inactivity, slightly **boost** progression speed (e.g., allow larger weekly % increases back up to prior level).
- This is more UX logic than strict physiology; keep as heuristic and not essential.

---

## 7. Safety \& Guardrails (Non-Medical)

Evidence: overuse injuries correlate with **load spikes**, **chronic high intensity**, and **monotony**.[web:92][web:126]

### 7.1 Metrics

- Weekly session-RPE load:

$$
Load_{week} = \sum_{sessions} Duration_{min} \times RPE_{session}
$$

- Monotony (variation):

$$
Monotony = \frac{\text{mean}(Load_{session})}{\text{SD}(Load_{session})}
$$

Empirical findings (mostly team sports, but generalizable as principles):[web:92][web:126]

- Large weekly spikes (50%+ above 4-week rolling average) → higher injury risk.
- Very low variation (high monotony) → higher overuse risk.


### 7.2 Simple Guardrails

**1) Weekly load spike warning**

Let L_week be this week’s total session-RPE load, L_4wk_avg the average of last 4 weeks.

If:

$$
L_{week} > 1.5 \times L_{4wk\_avg}
$$

→ Show yellow warning:

“Your total training stress is ~50% higher than usual this week. This pattern is associated with higher injury risk in athletes.[web:92] Consider reducing volume or taking a lighter week.”

**2) Chronic high-intensity warning**

If >30% of sets in last 2 weeks are RPE 9–10:

→ Show caution:

“You’ve accumulated a lot of very hard sets (RPE 9–10). Sustained very high effort is associated with fatigue and overuse in the literature.[web:126] Consider keeping most work around RPE 7–8.”

**3) Volume upper bounds**

If a muscle group consistently exceeds MRV (e.g., ≥25 hard sets/week for intermediates):

→ Suggest:

“You’re training [muscle] with very high weekly volume relative to research-based norms.[web:54] Consider reducing sets or adding a deload week.”

---

## 8. Implementation Summary (Minimal API for Devs)

### 8.1 Core Inputs per Set

- exercise_name
- primary_muscles (list with fractions)
- load_kg
- reps
- RPE or RIR (optional but recommended)
- is_compound (bool)
- eccentric_heavy (bool)


### 8.2 Core Per-User Constants

- age
- sex
- BW
- training_age_years


### 8.3 Core Computations

Per set / per top set:

1. `est_1rm = brzycki_1rm(load, reps)`
2. `rel_strength = est_1rm / (BW**0.67)`
3. `exercise_score = exercise_strength_score(rel_strength, norm)`

Per muscle per week:

4. Volume load and hard sets.
5. `muscle_score = muscle_group_score(...)`

Per user per day:

6. Recovery: use `recovery_status(...)` per muscle trained last.
7. Detraining: apply `detraining_decay_factor(...)` based on days since last session.

---

## 9. Evidence Strength Markers

- **Strong evidence (can be locked):**
    - Allometric exponent ~0.67.[web:10][web:194]
    - Session-RPE load and its correlation to internal load.[web:126][web:123]
    - Hard-set based volume landmarks for hypertrophy.[web:54][web:193]
    - Detraining direction \& magnitude (meta-analyses).[web:213][web:77]
- **Moderate (use with ranges, not single numbers):**
    - Recovery times by RPE band.[web:32][web:35][web:56]
    - Eccentric vs. concentric recovery differences.[web:56][web:167]
    - Compound vs isolation recovery differences.[web:35][web:50]
- **Heuristic (must be tunable):**
    - Exact multipliers for sleep and training age.
    - Exact τ_half values in detraining (the structure is evidence-based, but numbers are tuned).

---

## 10. References (Key)

- Detraining: Bosquet/Gentil “Effect of training cessation on muscular performance: a meta-analysis”, Sports Med 2013.[web:213]
- Detraining in older: “Use It or Lose It? A Meta-Analysis on the Effects of Resistance Training Cessation (Detraining) on Muscle Size in Older Adults”, Int J Environ Res Public Health 2022.[web:77][web:153]
- Recovery \& DOMS: Dupuy et al. “An Evidence-Based Approach for Choosing Post-exercise Recovery Techniques…”, Front Physiol 2018.[web:160][web:43]
- Volume \& hypertrophy: Schoenfeld et al. 2016/2017 dose–response papers.[web:54][web:193]
- Session-RPE: Haddad et al. 2017 review.[web:126][web:123]
- Allometric scaling: Folland \& Cauley 2008.[web:10][web:25][web:194]

(Your dev team does not need to read these to implement, but they are here for traceability.)

---
This single document is what you can drop into your repo as `gym_gamification_logic_spec.md` and hand directly to your team.
```
[^1]: https://onlinelibrary.wiley.com/doi/10.1111/sms.12047
[^2]: https://downloads.hindawi.com/journals/bmri/2022/2130993.pdf
[^3]: https://www.mdpi.com/1660-4601/19/21/14048/pdf?version=1666948598
[^4]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9398774/
[^5]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7241623/
[^6]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9657634/
[^7]: https://onlinelibrary.wiley.com/doi/10.1002/ejsc.12093
[^8]: https://pmc.ncbi.nlm.nih.gov/articles/PMC11235952/
[^9]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10717004/
[^10]: https://paulogentil.com/pdf/Effect%20of%20training%20cessation%20on%20muscular%20performance%20-%20A%20meta%20analysis.pdf
[^11]: https://pubmed.ncbi.nlm.nih.gov/23347054/
[^12]: https://www.semanticscholar.org/paper/Effect-of-training-cessation-on-muscular-A-Bosquet-Bosquet/c21ed453e3fc87e3101ac5af7a8d45746c303647
[^13]: https://www.scribd.com/document/375776294/Destreinamento-pdf
[^14]: https://onlinelibrary.wiley.com/doi/10.1111/sms.14739
[^15]: https://pubmed.ncbi.nlm.nih.gov/36360927/
[^16]: https://pmc.ncbi.nlm.nih.gov/articles/PMC5932411/
[^17]: https://pmc.ncbi.nlm.nih.gov/articles/PMC12194023/
[^18]: https://www.semanticscholar.org/paper/e697d6c2585e1f24239e64efcda5f16c3ac5fc6a
[^19]: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00403/full
[^20]: https://functionsmart.com/the-use-it-or-lose-it-truth-reversing-age-related-muscle-loss/
[^21]: https://pubmed.ncbi.nlm.nih.gov/29755363/
[^22]: https://pubmed.ncbi.nlm.nih.gov/33497853/
[^23]: https://www.sciencedirect.com/science/article/pii/S2405844024082276
[^24]: https://journals.physiology.org/doi/full/10.1152/physiol.00044.2018
[^25]: https://www.semanticscholar.org/paper/An-Evidence-Based-Approach-for-Choosing-Recovery-to-Dupuy-Douzi/634f4c715da0a38f6b80a5fbfee4d3796f0eb248
[^26]: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full
[^27]: https://discovery.researcher.life/article/a-evidence-based-approach-to-selecting-post-exercise-cryostimulation-techniques-for-improving-exercise-performance-and-fatigue-recovery-a-systematic-review-and-meta-analysis/7a869a3816d03c28aa55cb5c297cd4f4
[^28]: https://ouci.dntb.gov.ua/en/works/lmByDPj9/
[^29]: https://journal.iusca.org/index.php/Journal/article/view/135/227
```



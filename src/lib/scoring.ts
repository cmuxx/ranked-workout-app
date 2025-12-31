import scoringConfig from '@/../config/scoring.json';

// ============================================================================
// TYPES
// ============================================================================

export type RankTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'apex' | 'mythic';

export interface RankInfo {
  tier: RankTier;
  score: number;
  color: string;
}

export interface RecoveryState {
  fraction: number;
  status: 'need_recovery' | 'recovering' | 'ready';
  tauHours: number;
}

// ============================================================================
// 1RM ESTIMATION
// ============================================================================

/**
 * Brzycki equation for 1RM estimation (accurate for 1-10 reps)
 */
export function brzycki1RM(loadKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return loadKg;
  return loadKg / (1.0278 - 0.0278 * reps);
}

/**
 * Epley equation for 1RM estimation
 */
export function epley1RM(loadKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return loadKg;
  return loadKg * (1 + 0.0333 * reps);
}

/**
 * Estimate 1RM from RIR (Reps in Reserve)
 */
export function rirBased1RM(loadKg: number, rir: number): number {
  const percentages = scoringConfig.rirToPercentage as Record<string, number>;
  const pct = percentages[rir.toString()] ?? 0.85;
  return loadKg / pct;
}

/**
 * Estimate 1RM using the configured default method
 */
export function estimate1RM(loadKg: number, reps: number, rir?: number): number {
  // If RIR is provided and reps is 1, use RIR-based estimation
  if (rir !== undefined && reps === 1) {
    return rirBased1RM(loadKg, rir);
  }

  const method = scoringConfig.oneRmEstimation.defaultMethod;
  if (method === 'epley') {
    return epley1RM(loadKg, reps);
  }
  return brzycki1RM(loadKg, reps);
}

/**
 * Check if 1RM estimate has low confidence (reps > threshold)
 */
export function isLowConfidence1RM(reps: number): boolean {
  return reps > scoringConfig.oneRmEstimation.lowConfidenceThreshold;
}

// ============================================================================
// RELATIVE STRENGTH & SCALING
// ============================================================================

/**
 * Calculate allometric relative strength
 * Strength scales with cross-sectional area (~BW^0.67)
 */
export function allometricRelativeStrength(oneRmKg: number, bodyweightKg: number): number {
  const exponent = scoringConfig.scoring.allometricExponent;
  return oneRmKg / Math.pow(bodyweightKg, exponent);
}

/**
 * Get age adjustment factor for cross-age comparison
 */
export function getAgeAdjustmentFactor(age: number): number {
  const factors = scoringConfig.ageAdjustmentFactors;
  
  if (age >= 65) return factors['65+'];
  if (age >= 56) return factors['56-65'];
  if (age >= 46) return factors['46-55'];
  if (age >= 36) return factors['36-45'];
  if (age >= 25) return factors['25-35'];
  return factors['18-24'];
}

// ============================================================================
// STRENGTH SCORES
// ============================================================================

/**
 * Get percentile from relative strength using piecewise linear interpolation
 * Based on strength standards for the given sex
 */
export function getPercentileFromRelStrength(relStrength: number, sex: string): number {
  const standards = sex === 'female' 
    ? scoringConfig.scoring.strengthStandardPercentiles.female
    : scoringConfig.scoring.strengthStandardPercentiles.male;
  
  const levels = [
    standards.beginner,
    standards.novice,
    standards.intermediate,
    standards.advanced,
    standards.elite,
  ];
  
  // Below beginner
  if (relStrength <= levels[0].relStrength) {
    return (relStrength / levels[0].relStrength) * levels[0].percentile;
  }
  
  // Above elite
  if (relStrength >= levels[4].relStrength) {
    // Extrapolate slightly above elite, cap at 99.9
    const extra = (relStrength - levels[4].relStrength) / levels[4].relStrength;
    return Math.min(99.9, levels[4].percentile + extra * 4);
  }
  
  // Interpolate between levels
  for (let i = 0; i < levels.length - 1; i++) {
    if (relStrength >= levels[i].relStrength && relStrength < levels[i + 1].relStrength) {
      const range = levels[i + 1].relStrength - levels[i].relStrength;
      const progress = (relStrength - levels[i].relStrength) / range;
      const percentileRange = levels[i + 1].percentile - levels[i].percentile;
      return levels[i].percentile + progress * percentileRange;
    }
  }
  
  return 50; // Default to intermediate
}

/**
 * Convert percentile to score (0-100) using configured bands
 * Maps so that 50th percentile (average) = ~37 (Silver)
 */
export function percentileToScore(percentile: number): number {
  const bands = scoringConfig.scoring.percentileToScore.bands;
  
  for (const band of bands) {
    if (percentile >= band.percentileMin && percentile < band.percentileMax) {
      const percentileRange = band.percentileMax - band.percentileMin;
      const scoreRange = band.scoreMax - band.scoreMin;
      const progress = (percentile - band.percentileMin) / percentileRange;
      return band.scoreMin + progress * scoreRange;
    }
  }
  
  // Handle edge case of exactly 100th percentile
  if (percentile >= 99) {
    return scoringConfig.scoring.maxScore;
  }
  
  return 0;
}

/**
 * Calculate exercise strength score (0-100) from relative strength
 * Uses percentile-based mapping for more accurate ranking
 */
export function exerciseStrengthScore(relStrength: number, sex: string, strengthStandard: number = 1.0): number {
  // Adjust relative strength by the exercise's strength standard
  // Higher standard = harder exercise = lower expected relative strength
  const adjustedRelStrength = relStrength / strengthStandard;
  
  const percentile = getPercentileFromRelStrength(adjustedRelStrength, sex);
  const score = percentileToScore(percentile);
  
  const { maxScore, minScore } = scoringConfig.scoring;
  return Math.max(minScore, Math.min(maxScore, score));
}

/**
 * Calculate strength score for an exercise (simplified version for API use)
 */
export function calculateStrengthScore(
  oneRmKg: number,
  bodyweightKg: number,
  sex: string,
  age: number,
  strengthStandard: number = 1.0
): number {
  const relStrength = allometricRelativeStrength(oneRmKg, bodyweightKg);
  const ageAdjustment = getAgeAdjustmentFactor(age);
  
  // Apply age adjustment to boost older lifters' relative strength
  const adjustedRelStrength = relStrength * ageAdjustment;
  
  const score = exerciseStrengthScore(adjustedRelStrength, sex, strengthStandard);
  return score;
}

/**
 * Apply recency decay to a score based on days since the PR
 * Uses exponential decay with configurable half-life
 */
export function applyRecencyDecay(score: number, daysSincePR: number): number {
  const halfLife = scoringConfig.recency.halfLifeDays;
  const decayFactor = Math.pow(0.5, daysSincePR / halfLife);
  return score * decayFactor;
}

/**
 * Calculate volume score (0-100) based on weekly hard sets
 * Uses MEV/MAV/MRV landmarks for the user's training level
 */
export function calculateVolumeScore(
  weeklyHardSets: number,
  trainingAgeYears: number
): number {
  const landmarks = getVolumeLandmarks(trainingAgeYears);
  const mev = landmarks.MEV;
  const mavLow = landmarks.MAV[0];
  const mavHigh = landmarks.MAV[1];
  const mrv = landmarks.MRV;
  
  if (weeklyHardSets <= 0) return 0;
  
  // Below MEV: ramp 0 → 70
  if (weeklyHardSets < mev) {
    return (weeklyHardSets / mev) * 70;
  }
  
  // MEV → MAV low: ramp 70 → 85
  if (weeklyHardSets < mavLow) {
    const progress = (weeklyHardSets - mev) / (mavLow - mev);
    return 70 + progress * 15;
  }
  
  // MAV low → MAV high: ramp 85 → 100
  if (weeklyHardSets < mavHigh) {
    const progress = (weeklyHardSets - mavLow) / (mavHigh - mavLow);
    return 85 + progress * 15;
  }
  
  // MAV high → MRV: slowly fall 100 → 85
  if (weeklyHardSets < mrv) {
    const progress = (weeklyHardSets - mavHigh) / (mrv - mavHigh);
    return 100 - progress * 15;
  }
  
  // Above MRV: penalize toward 60 (overreach risk)
  const overreach = (weeklyHardSets - mrv) / mrv;
  return Math.max(60, 85 - overreach * 25);
}

/**
 * Calculate combined muscle group score (strength + volume)
 */
export function calculateMuscleScore(
  strengthScore: number,
  volumeScore: number
): number {
  const strengthWeight = scoringConfig.scoring.strengthWeight;
  const volumeWeight = scoringConfig.scoring.volumeWeight;
  
  return strengthScore * strengthWeight + volumeScore * volumeWeight;
}

/**
 * Apply evidence gating - cap score based on training history
 */
export function applyEvidenceGating(
  score: number,
  sessionsInWindow: number,
  windowDays: number
): number {
  const gating = scoringConfig.evidenceGating;
  
  // Check if user qualifies for no cap
  if (windowDays >= gating.noCap.requirements.windowDays &&
      sessionsInWindow >= gating.noCap.requirements.minSessions) {
    return score;
  }
  
  // Check diamond cap
  if (windowDays >= gating.diamondCap.requirements.windowDays &&
      sessionsInWindow >= gating.diamondCap.requirements.minSessions) {
    return Math.min(score, gating.diamondCap.maxScore);
  }
  
  // Check gold cap
  if (windowDays >= gating.goldCap.requirements.windowDays &&
      sessionsInWindow >= gating.goldCap.requirements.minSessions) {
    return Math.min(score, gating.goldCap.maxScore);
  }
  
  // Default to silver cap
  return Math.min(score, gating.silverCap.maxScore);
}

/**
 * Check if a set qualifies as a "strength test" for scoring purposes
 */
export function isQualifyingStrengthSet(
  reps: number,
  rpe?: number | null,
  rir?: number | null
): boolean {
  const conf = scoringConfig.confidenceGating;
  
  // Must be low reps
  if (reps > conf.maxReps) return false;
  
  // If RPE is provided, check it
  if (rpe !== undefined && rpe !== null && rpe >= conf.minRPE) return true;
  
  // If RIR is provided, check it
  if (rir !== undefined && rir !== null && rir <= conf.maxRIR) return true;
  
  // If neither RPE nor RIR provided, assume it qualifies if reps <= 10
  // (user might not track RPE/RIR)
  if (rpe === undefined && rir === undefined) return true;
  if (rpe === null && rir === null) return true;
  
  return false;
}

/**
 * Calculate volume-weighted muscle group score (legacy - for backwards compatibility)
 */
export function muscleGroupScore(exerciseScores: number[], volumeWeights: number[]): number {
  if (exerciseScores.length === 0 || volumeWeights.length === 0) return 0;
  
  const totalWeight = volumeWeights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = exerciseScores.reduce(
    (sum, score, i) => sum + score * (volumeWeights[i] ?? 0),
    0
  );
  
  return weightedSum / totalWeight;
}

/**
 * Calculate overall score from muscle group scores
 */
export function overallScore(muscleGroupScores: number[]): number {
  if (muscleGroupScores.length === 0) return 0;
  return muscleGroupScores.reduce((a, b) => a + b, 0) / muscleGroupScores.length;
}

// ============================================================================
// RANKING
// ============================================================================

/**
 * Get rank tier from numeric score
 */
export function getRankTier(score: number): RankTier {
  const tiers = scoringConfig.rankTiers;
  
  if (score >= tiers.mythic.min) return 'mythic';
  if (score >= tiers.apex.min) return 'apex';
  if (score >= tiers.diamond.min) return 'diamond';
  if (score >= tiers.gold.min) return 'gold';
  if (score >= tiers.silver.min) return 'silver';
  return 'bronze';
}

// Alias for API compatibility
export const determineRank = getRankTier;

/**
 * Get full rank information including tier, score, and color
 */
export function getRankInfo(score: number): RankInfo {
  const tier = getRankTier(score);
  const tierConfig = scoringConfig.rankTiers[tier];
  
  return {
    tier,
    score,
    color: tierConfig.color,
  };
}

/**
 * Get all rank tier thresholds
 */
export function getRankThresholds() {
  return scoringConfig.rankTiers;
}

// ============================================================================
// RECOVERY MODEL
// ============================================================================

/**
 * Get base recovery tau (time constant) from session RPE
 */
function getBaseTauHours(sessionRpe: number): number {
  const baseTau = scoringConfig.recovery.baseTauHours as Record<string, number>;
  const rpe = Math.round(Math.max(5, Math.min(10, sessionRpe)));
  return baseTau[rpe.toString()] ?? 36;
}

/**
 * Get exercise type multiplier for recovery
 */
function getExerciseTypeMultiplier(isCompound: boolean): number {
  const { exerciseType } = scoringConfig.recovery.multipliers;
  return isCompound ? exerciseType.compound : exerciseType.isolation;
}

/**
 * Get training age multiplier for recovery
 */
function getTrainingAgeMultiplier(trainingAgeYears: number): number {
  const { trainingAge } = scoringConfig.recovery.multipliers;
  
  if (trainingAgeYears < 1) return trainingAge.novice;
  if (trainingAgeYears < 3) return trainingAge.intermediate;
  if (trainingAgeYears < 5) return trainingAge.advanced;
  return trainingAge.expert;
}

/**
 * Get sleep multiplier for recovery
 */
function getSleepMultiplier(sleepHours: number): number {
  const { sleepHours: sleepConfig } = scoringConfig.recovery.multipliers;
  
  if (sleepHours >= 8) return sleepConfig['8+'];
  if (sleepHours >= 7) return sleepConfig['7-8'];
  if (sleepHours >= 6) return sleepConfig['6-7'];
  if (sleepHours >= 5) return sleepConfig['5-6'];
  return sleepConfig['<5'];
}

/**
 * Calculate adjusted tau (time constant) for recovery
 */
export function adjustedTauHours(
  sessionRpe: number,
  isCompound: boolean = true,
  isEccentricHeavy: boolean = false,
  trainingAgeYears: number = 1,
  sleepHours: number = 7
): number {
  const baseTau = getBaseTauHours(sessionRpe);
  
  let tau = baseTau;
  tau *= getExerciseTypeMultiplier(isCompound);
  tau *= isEccentricHeavy ? scoringConfig.recovery.multipliers.eccentricHeavy : 1;
  tau *= getTrainingAgeMultiplier(trainingAgeYears);
  tau *= getSleepMultiplier(sleepHours);
  
  return tau;
}

/**
 * Calculate recovery fraction (0-1) based on time since session
 */
export function recoveryFraction(hoursSinceSession: number, tauHours: number): number {
  return 1 - Math.exp(-hoursSinceSession / tauHours);
}

/**
 * Get recovery status from recovery fraction
 */
export function getRecoveryStatus(fraction: number): 'need_recovery' | 'recovering' | 'ready' {
  const { states } = scoringConfig.recovery;
  
  if (fraction < states.need_recovery.max) return 'need_recovery';
  if (fraction < states.recovering.max) return 'recovering';
  return 'ready';
}

/**
 * Calculate full recovery state
 */
export function calculateRecoveryState(
  hoursSinceSession: number,
  sessionRpe: number,
  options?: {
    isCompound?: boolean;
    isEccentricHeavy?: boolean;
    trainingAgeYears?: number;
    sleepHours?: number;
  }
): RecoveryState {
  const tau = adjustedTauHours(
    sessionRpe,
    options?.isCompound ?? true,
    options?.isEccentricHeavy ?? false,
    options?.trainingAgeYears ?? 1,
    options?.sleepHours ?? 7
  );
  
  const fraction = recoveryFraction(hoursSinceSession, tau);
  const status = getRecoveryStatus(fraction);
  
  return { fraction, status, tauHours: tau };
}

// ============================================================================
// DETRAINING & RANK DECAY
// ============================================================================

/**
 * Get detraining tau (half-life in days) based on age and training experience
 */
export function getDetrainingTauHalf(age: number, trainingAgeYears: number): number {
  const { tauHalfDays, ageThreshold } = scoringConfig.decay;
  
  const isOlder = age >= ageThreshold;
  const isTrained = trainingAgeYears >= 1;
  
  if (isOlder) {
    return isTrained ? tauHalfDays.olderTrained : tauHalfDays.olderNovice;
  }
  return isTrained ? tauHalfDays.youngTrained : tauHalfDays.youngNovice;
}

/**
 * Calculate decay factor (0-1) for score reduction due to inactivity
 * Uses power-law decay model
 */
export function detrainingDecayFactor(
  daysInactive: number,
  age: number,
  trainingAgeYears: number
): number {
  const tau = getDetrainingTauHalf(age, trainingAgeYears);
  const { alpha, minRetention } = scoringConfig.decay;
  
  if (daysInactive <= 0) return 1.0;
  if (daysInactive >= 2 * tau) return minRetention;
  
  const phi = 1 - Math.pow(daysInactive / tau, alpha);
  return Math.max(minRetention, Math.min(1.0, phi));
}

/**
 * Apply decay to a score based on inactivity
 */
export function applyDecay(
  score: number,
  daysInactive: number,
  age: number,
  trainingAgeYears: number
): number {
  const factor = detrainingDecayFactor(daysInactive, age, trainingAgeYears);
  return score * factor;
}

// ============================================================================
// VOLUME CALCULATIONS
// ============================================================================

/**
 * Get training level based on training age
 */
export function getTrainingLevel(trainingAgeYears: number): 'novice' | 'intermediate' | 'advanced' {
  if (trainingAgeYears < 1) return 'novice';
  if (trainingAgeYears < 3) return 'intermediate';
  return 'advanced';
}

/**
 * Get volume landmarks for a training level
 */
export function getVolumeLandmarks(trainingAgeYears: number) {
  const level = getTrainingLevel(trainingAgeYears);
  return scoringConfig.volumeLandmarks[level];
}

/**
 * Calculate volume load for a set
 */
export function volumeLoad(sets: number, reps: number, loadKg: number): number {
  return sets * reps * loadKg;
}

// ============================================================================
// UNIT CONVERSIONS
// ============================================================================

export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

export function lbToKg(lb: number): number {
  return lb / 2.20462;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

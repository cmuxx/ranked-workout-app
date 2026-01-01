'use client';

import { cn } from '@/lib/utils';
import { RankTier, getRankTier } from '@/lib/scoring';

export interface MuscleGroupData {
  name: string;
  rank: RankTier;
  score: number;
  recoveryStatus: 'need_recovery' | 'recovering' | 'ready';
  lastTrained?: string;
  recentVolume?: number;
}

interface AnatomyVisualizationProps {
  muscleGroups?: MuscleGroupData[];
  muscleScores?: Record<string, number>;
  onMuscleClick?: (muscle: MuscleGroupData) => void;
  selectedMuscle?: string | null;
  className?: string;
  showLabels?: boolean;
}

// Rank-based colors matching the game's rank system
const rankColors: Record<RankTier, { fill: string; stroke: string; glow?: string }> = {
  bronze: { 
    fill: 'rgba(205, 127, 50, 0.85)', 
    stroke: '#CD7F32',
  },
  silver: { 
    fill: 'rgba(192, 192, 192, 0.85)', 
    stroke: '#C0C0C0',
  },
  gold: { 
    fill: 'rgba(255, 215, 0, 0.85)', 
    stroke: '#FFD700',
  },
  diamond: { 
    fill: 'rgba(185, 242, 255, 0.85)', 
    stroke: '#B9F2FF',
    glow: '0 0 8px rgba(185, 242, 255, 0.6)',
  },
  apex: { 
    fill: 'rgba(75, 0, 130, 0.85)', 
    stroke: '#4B0082',
    glow: '0 0 10px rgba(75, 0, 130, 0.6)',
  },
  mythic: { 
    fill: 'rgba(255, 0, 0, 0.9)', 
    stroke: '#FF0000',
    glow: '0 0 15px rgba(255, 0, 0, 0.8)',
  },
};

function getRankColor(rank: RankTier): { fill: string; stroke: string; glow?: string } {
  return rankColors[rank];
}

// Front view muscle paths - detailed anatomical style
const frontMuscles: Record<string, { path: string; group: string }> = {
  // NECK
  'neck-front': {
    path: 'M45,28 L43,38 L50,42 L57,38 L55,28 Q50,30 45,28',
    group: 'neck',
  },
  
  // TRAPS (upper) - front view
  'traps-front-left': {
    path: 'M43,38 L36,42 L38,50 L45,48 L43,38',
    group: 'back',
  },
  'traps-front-right': {
    path: 'M57,38 L64,42 L62,50 L55,48 L57,38',
    group: 'back',
  },
  
  // SHOULDERS (Deltoids)
  'delt-front-left': {
    path: 'M36,42 L28,48 L26,58 L30,66 L38,62 L38,50 L36,42',
    group: 'shoulders',
  },
  'delt-front-right': {
    path: 'M64,42 L72,48 L74,58 L70,66 L62,62 L62,50 L64,42',
    group: 'shoulders',
  },
  
  // CHEST (Pectorals)
  'pec-left': {
    path: 'M38,50 L38,68 C42,74 48,74 50,72 L50,50 C46,48 42,48 38,50',
    group: 'chest',
  },
  'pec-right': {
    path: 'M62,50 L62,68 C58,74 52,74 50,72 L50,50 C54,48 58,48 62,50',
    group: 'chest',
  },
  
  // BICEPS
  'bicep-left': {
    path: 'M26,60 L24,76 L22,88 C22,92 26,94 30,92 L32,80 L34,68 L30,66 L26,60',
    group: 'biceps',
  },
  'bicep-right': {
    path: 'M74,60 L76,76 L78,88 C78,92 74,94 70,92 L68,80 L66,68 L70,66 L74,60',
    group: 'biceps',
  },
  
  // FOREARMS
  'forearm-front-left': {
    path: 'M22,90 L18,118 L16,130 L24,132 L28,120 L30,94 L22,90',
    group: 'forearms',
  },
  'forearm-front-right': {
    path: 'M78,90 L82,118 L84,130 L76,132 L72,120 L70,94 L78,90',
    group: 'forearms',
  },
  
  // ABS / CORE
  'abs-upper': {
    path: 'M44,72 L44,84 L50,86 L56,84 L56,72 L50,74 L44,72',
    group: 'core',
  },
  'abs-mid': {
    path: 'M44,86 L44,100 L50,102 L56,100 L56,86 L50,88 L44,86',
    group: 'core',
  },
  'abs-lower': {
    path: 'M44,102 L44,116 C46,120 50,122 50,122 C50,122 54,120 56,116 L56,102 L50,104 L44,102',
    group: 'core',
  },
  
  // OBLIQUES
  'oblique-left': {
    path: 'M38,70 L36,90 L38,112 L44,116 L44,72 L38,70',
    group: 'core',
  },
  'oblique-right': {
    path: 'M62,70 L64,90 L62,112 L56,116 L56,72 L62,70',
    group: 'core',
  },
  
  // QUADS
  'quad-outer-left': {
    path: 'M36,118 L32,160 L34,190 L42,192 L44,160 L42,122 L36,118',
    group: 'quads',
  },
  'quad-inner-left': {
    path: 'M42,122 L44,160 L46,192 L50,190 L50,124 L46,122 L42,122',
    group: 'quads',
  },
  'quad-outer-right': {
    path: 'M64,118 L68,160 L66,190 L58,192 L56,160 L58,122 L64,118',
    group: 'quads',
  },
  'quad-inner-right': {
    path: 'M58,122 L56,160 L54,192 L50,190 L50,124 L54,122 L58,122',
    group: 'quads',
  },
  
  // CALVES (front - tibialis)
  'calf-front-left': {
    path: 'M34,194 L32,230 L34,260 L44,262 L46,230 L44,196 L34,194',
    group: 'calves',
  },
  'calf-front-right': {
    path: 'M66,194 L68,230 L66,260 L56,262 L54,230 L56,196 L66,194',
    group: 'calves',
  },
};

// Back view muscle paths
const backMuscles: Record<string, { path: string; group: string }> = {
  // NECK
  'neck-back': {
    path: 'M45,28 L43,38 L50,40 L57,38 L55,28 Q50,30 45,28',
    group: 'neck',
  },
  
  // TRAPS
  'trap-left': {
    path: 'M43,38 L34,46 L38,58 L46,54 L50,50 L50,40 L43,38',
    group: 'back',
  },
  'trap-right': {
    path: 'M57,38 L66,46 L62,58 L54,54 L50,50 L50,40 L57,38',
    group: 'back',
  },
  
  // REAR DELTS
  'delt-rear-left': {
    path: 'M34,46 L26,52 L24,64 L28,72 L36,68 L38,58 L34,46',
    group: 'shoulders',
  },
  'delt-rear-right': {
    path: 'M66,46 L74,52 L76,64 L72,72 L64,68 L62,58 L66,46',
    group: 'shoulders',
  },
  
  // LATS
  'lat-left': {
    path: 'M38,58 L32,72 L30,95 L36,110 L44,108 L44,70 L46,54 L38,58',
    group: 'back',
  },
  'lat-right': {
    path: 'M62,58 L68,72 L70,95 L64,110 L56,108 L56,70 L54,54 L62,58',
    group: 'back',
  },
  
  // MID BACK (Rhomboids/Mid Traps)
  'mid-back': {
    path: 'M46,54 L44,70 L44,90 L50,94 L56,90 L56,70 L54,54 L50,50 L46,54',
    group: 'back',
  },
  
  // LOWER BACK (Erector Spinae)
  'lower-back-left': {
    path: 'M44,92 L42,115 L46,120 L50,118 L50,96 L44,92',
    group: 'back',
  },
  'lower-back-right': {
    path: 'M56,92 L58,115 L54,120 L50,118 L50,96 L56,92',
    group: 'back',
  },
  
  // TRICEPS
  'tricep-left': {
    path: 'M28,72 L24,78 L22,92 C22,96 26,98 30,96 L32,84 L34,74 L28,72',
    group: 'triceps',
  },
  'tricep-right': {
    path: 'M72,72 L76,78 L78,92 C78,96 74,98 70,96 L68,84 L66,74 L72,72',
    group: 'triceps',
  },
  
  // FOREARMS (back)
  'forearm-back-left': {
    path: 'M22,94 L18,120 L16,134 L24,136 L28,122 L30,98 L22,94',
    group: 'forearms',
  },
  'forearm-back-right': {
    path: 'M78,94 L82,120 L84,134 L76,136 L72,122 L70,98 L78,94',
    group: 'forearms',
  },
  
  // GLUTES
  'glute-left': {
    path: 'M36,112 L32,130 L36,148 L50,150 L50,120 L46,118 L36,112',
    group: 'glutes',
  },
  'glute-right': {
    path: 'M64,112 L68,130 L64,148 L50,150 L50,120 L54,118 L64,112',
    group: 'glutes',
  },
  
  // HAMSTRINGS
  'hamstring-left': {
    path: 'M36,150 L34,180 L36,210 L44,212 L46,180 L48,154 L36,150',
    group: 'hamstrings',
  },
  'hamstring-right': {
    path: 'M64,150 L66,180 L64,210 L56,212 L54,180 L52,154 L64,150',
    group: 'hamstrings',
  },
  
  // CALVES (gastrocnemius)
  'calf-back-left': {
    path: 'M34,214 L32,240 L34,270 L44,272 L46,240 L44,216 L34,214',
    group: 'calves',
  },
  'calf-back-right': {
    path: 'M66,214 L68,240 L66,270 L56,272 L54,240 L56,216 L66,214',
    group: 'calves',
  },
};

// Map to general muscle groups
const muscleGroupMapping: Record<string, string> = {
  'neck-front': 'neck',
  'neck-back': 'neck',
  'traps-front-left': 'back',
  'traps-front-right': 'back',
  'trap-left': 'back',
  'trap-right': 'back',
  'delt-front-left': 'shoulders',
  'delt-front-right': 'shoulders',
  'delt-rear-left': 'shoulders',
  'delt-rear-right': 'shoulders',
  'pec-left': 'chest',
  'pec-right': 'chest',
  'bicep-left': 'biceps',
  'bicep-right': 'biceps',
  'tricep-left': 'triceps',
  'tricep-right': 'triceps',
  'forearm-front-left': 'forearms',
  'forearm-front-right': 'forearms',
  'forearm-back-left': 'forearms',
  'forearm-back-right': 'forearms',
  'abs-upper': 'core',
  'abs-mid': 'core',
  'abs-lower': 'core',
  'oblique-left': 'core',
  'oblique-right': 'core',
  'lat-left': 'back',
  'lat-right': 'back',
  'mid-back': 'back',
  'lower-back-left': 'back',
  'lower-back-right': 'back',
  'quad-outer-left': 'quads',
  'quad-inner-left': 'quads',
  'quad-outer-right': 'quads',
  'quad-inner-right': 'quads',
  'glute-left': 'glutes',
  'glute-right': 'glutes',
  'hamstring-left': 'hamstrings',
  'hamstring-right': 'hamstrings',
  'calf-front-left': 'calves',
  'calf-front-right': 'calves',
  'calf-back-left': 'calves',
  'calf-back-right': 'calves',
};

function MusclePath({
  id,
  pathData,
  rank,
  isSelected,
  onClick,
}: {
  id: string;
  pathData: { path: string; group: string };
  rank: RankTier | null;
  isSelected: boolean;
  onClick?: () => void;
}) {
  const colors = rank ? getRankColor(rank) : null;
  const fillColor = colors ? colors.fill : '#1b1f28';
  const strokeColor = isSelected ? '#ffffff' : (colors ? colors.stroke : '#5ba4c9');
  const strokeWidth = isSelected ? 1.8 : 1.1;
  const glowEffect = isSelected ? '0 0 10px rgba(255,255,255,0.45)' : colors?.glow;

  return (
    <path
      d={pathData.path}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      onClick={onClick}
      role="button"
      aria-label={`${pathData.group} region`}
      className={cn(
        'transition-all duration-300',
        onClick && 'cursor-pointer hover:brightness-110'
      )}
      style={{
        filter: glowEffect ? `drop-shadow(${glowEffect})` : undefined,
        pointerEvents: onClick ? 'visiblePainted' : 'none',
      }}
    />
  );
}

// Body silhouette paths
const frontBodySilhouette = `
  M50,5 
  C40,5 32,14 32,26 C32,38 40,46 50,46 C60,46 68,38 68,26 C68,14 60,5 50,5
  M36,42 L28,48 L22,62 L16,130 L26,134 L30,100 L34,118 
  C34,120 40,124 50,124 C60,124 66,120 66,118 
  L70,100 L74,134 L84,130 L78,62 L72,48 L64,42
  M34,120 L30,195 L32,265 L48,268 L50,196 L50,124
  M66,120 L70,195 L68,265 L52,268 L50,196 L50,124
`;

const backBodySilhouette = `
  M50,5 
  C40,5 32,14 32,26 C32,38 40,46 50,46 C60,46 68,38 68,26 C68,14 60,5 50,5
  M36,42 L28,52 L22,68 L16,134 L26,138 L30,104 L34,152 
  C34,154 40,158 50,158 C60,158 66,154 66,152 
  L70,104 L74,138 L84,134 L78,68 L72,52 L64,42
  M34,154 L30,215 L32,275 L48,278 L50,158
  M66,154 L70,215 L68,275 L52,278 L50,158
`;

// Head silhouette
const headPath = 'M50,5 C38,5 30,16 30,28 C30,40 38,48 50,48 C62,48 70,40 70,28 C70,16 62,5 50,5';

export function AnatomyVisualization({
  muscleGroups,
  muscleScores,
  onMuscleClick,
  selectedMuscle,
  className,
}: AnatomyVisualizationProps) {
  const getMuscleData = (muscleId: string): MuscleGroupData | undefined => {
    const groupName = muscleGroupMapping[muscleId] || muscleId;
    
    if (muscleGroups) {
      return muscleGroups.find(
        (m) => m.name.toLowerCase() === groupName.toLowerCase()
      );
    }
    
    if (muscleScores && muscleScores[groupName.toLowerCase()] !== undefined) {
      const score = muscleScores[groupName.toLowerCase()];
      return {
        name: groupName,
        score,
        rank: getRankTier(score),
        recoveryStatus: 'ready',
      };
    }
    
    return undefined;
  };

  const handleClick = (muscleId: string) => {
    if (onMuscleClick) {
      const data = getMuscleData(muscleId);
      if (data) onMuscleClick(data);
    }
  };

  const isSelected = (muscleId: string): boolean => {
    if (!selectedMuscle) return false;
    const groupName = muscleGroupMapping[muscleId] || muscleId;
    return selectedMuscle.toLowerCase() === groupName.toLowerCase();
  };

  return (
    <div className={cn('flex gap-6 sm:gap-10 justify-center items-start py-4', className)}>
      {/* Front view */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground mb-2 font-medium">Front</span>
        <svg 
          viewBox="0 0 100 280" 
          className="w-28 sm:w-36 aspect-[100/280] drop-shadow-[0_0_18px_rgba(0,0,0,0.45)]"
          role="img"
          aria-label="Front muscle map"
        >
          <defs>
            <linearGradient id="silhouetteFront" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c1c1f" />
              <stop offset="50%" stopColor="#0f0f12" />
              <stop offset="100%" stopColor="#0b0b0f" />
            </linearGradient>
            <clipPath id="frontClip">
              <path d={frontBodySilhouette} />
            </clipPath>
          </defs>
          
          {/* Body silhouette base */}
          <path
            d={frontBodySilhouette}
            fill="url(#silhouetteFront)"
            stroke="#4aa6d9"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.92}
          />
          
          {/* Head */}
          <path d={headPath} fill="#0c0d10" stroke="#4aa6d9" strokeWidth="1.1" />
          
          {/* Hands */}
          <ellipse cx="18" cy="138" rx="6" ry="8" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          <ellipse cx="82" cy="138" rx="6" ry="8" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          
          {/* Feet */}
          <ellipse cx="40" cy="272" rx="8" ry="4" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          <ellipse cx="60" cy="272" rx="8" ry="4" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />

          <g clipPath="url(#frontClip)">
            {Object.entries(frontMuscles).map(([id, pathData]) => {
              const data = getMuscleData(id);
              return (
                <MusclePath
                  key={id}
                  id={id}
                  pathData={pathData}
                  rank={data?.rank || null}
                  isSelected={isSelected(id)}
                  onClick={() => handleClick(id)}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Back view */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground mb-2 font-medium">Back</span>
        <svg 
          viewBox="0 0 100 290" 
          className="w-28 sm:w-36 aspect-[100/290] drop-shadow-[0_0_18px_rgba(0,0,0,0.45)]"
          role="img"
          aria-label="Back muscle map"
        >
          <defs>
            <linearGradient id="silhouetteBack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c1c1f" />
              <stop offset="50%" stopColor="#0f0f12" />
              <stop offset="100%" stopColor="#0b0b0f" />
            </linearGradient>
            <clipPath id="backClip">
              <path d={backBodySilhouette} />
            </clipPath>
          </defs>

          {/* Body silhouette base */}
          <path
            d={backBodySilhouette}
            fill="url(#silhouetteBack)"
            stroke="#4aa6d9"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.92}
          />
          
          {/* Head */}
          <path d={headPath} fill="#0c0d10" stroke="#4aa6d9" strokeWidth="1.1" />
          
          {/* Hands */}
          <ellipse cx="18" cy="142" rx="6" ry="8" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          <ellipse cx="82" cy="142" rx="6" ry="8" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          
          {/* Feet */}
          <ellipse cx="40" cy="282" rx="8" ry="4" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          <ellipse cx="60" cy="282" rx="8" ry="4" fill="#12141b" stroke="#4aa6d9" strokeWidth="0.8" />
          
          <g clipPath="url(#backClip)">
            {Object.entries(backMuscles).map(([id, pathData]) => {
              const data = getMuscleData(id);
              return (
                <MusclePath
                  key={id}
                  id={id}
                  pathData={pathData}
                  rank={data?.rank || null}
                  isSelected={isSelected(id)}
                  onClick={() => handleClick(id)}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

// Recovery indicator component
interface RecoveryIndicatorProps {
  status: 'need_recovery' | 'recovering' | 'ready';
  className?: string;
}

export function RecoveryIndicator({ status, className }: RecoveryIndicatorProps) {
  const config = {
    need_recovery: {
      color: 'bg-red-500',
      label: 'Need Recovery',
      textColor: 'text-red-500',
    },
    recovering: {
      color: 'bg-yellow-500',
      label: 'Recovering',
      textColor: 'text-yellow-500',
    },
    ready: {
      color: 'bg-green-500',
      label: 'Ready',
      textColor: 'text-green-500',
    },
  };

  const { color, label, textColor } = config[status];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-2 h-2 rounded-full', color)} />
      <span className={cn('text-xs font-medium', textColor)}>{label}</span>
    </div>
  );
}

// Legend component for the visualization
export function AnatomyLegend({ className }: { className?: string }) {
  const ranks: { label: string; rank: RankTier }[] = [
    { label: 'Bronze', rank: 'bronze' },
    { label: 'Silver', rank: 'silver' },
    { label: 'Gold', rank: 'gold' },
    { label: 'Diamond', rank: 'diamond' },
    { label: 'Apex', rank: 'apex' },
    { label: 'Mythic', rank: 'mythic' },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2 justify-center', className)}>
      <div className="flex items-center gap-1.5">
        <div 
          className="w-3 h-3 rounded-sm border" 
          style={{ backgroundColor: '#2a2a2a', borderColor: '#5ba4c9' }} 
        />
        <span className="text-xs text-muted-foreground">Untrained</span>
      </div>
      {ranks.map(({ label, rank }) => {
        const colors = getRankColor(rank);
        return (
          <div key={rank} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ 
                backgroundColor: colors.fill,
                border: `1px solid ${colors.stroke}`,
                boxShadow: colors.glow,
              }}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

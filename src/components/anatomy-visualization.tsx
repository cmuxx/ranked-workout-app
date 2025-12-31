'use client';

import { cn } from '@/lib/utils';
import { RankTier, getRankTier } from '@/lib/scoring';

export interface MuscleGroupData {
  name: string;
  rank: RankTier;
  score: number;
  recoveryStatus: 'need_recovery' | 'recovering' | 'ready';
  lastTrained?: string;
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
    fill: 'rgba(205, 127, 50, 0.7)', 
    stroke: '#CD7F32',
  },
  silver: { 
    fill: 'rgba(192, 192, 192, 0.7)', 
    stroke: '#C0C0C0',
  },
  gold: { 
    fill: 'rgba(255, 215, 0, 0.75)', 
    stroke: '#FFD700',
  },
  diamond: { 
    fill: 'rgba(185, 242, 255, 0.75)', 
    stroke: '#B9F2FF',
    glow: '0 0 8px rgba(185, 242, 255, 0.6)',
  },
  champion: { 
    fill: 'rgba(155, 89, 182, 0.75)', 
    stroke: '#9B59B6',
    glow: '0 0 10px rgba(155, 89, 182, 0.6)',
  },
  elite: { 
    fill: 'rgba(231, 76, 60, 0.8)', 
    stroke: '#E74C3C',
    glow: '0 0 12px rgba(231, 76, 60, 0.6)',
  },
  unreal: { 
    fill: 'rgba(255, 0, 255, 0.8)', 
    stroke: '#FF00FF',
    glow: '0 0 15px rgba(255, 0, 255, 0.8)',
  },
};

// Get color based on rank
function getRankColor(rank: RankTier): { fill: string; stroke: string; glow?: string } {
  return rankColors[rank];
}

// Detailed anatomical SVG paths for front view
const frontMuscles = {
  head: {
    path: 'M50,8 C42,8 36,14 36,24 C36,34 42,42 50,42 C58,42 64,34 64,24 C64,14 58,8 50,8',
    label: 'Head',
    labelPos: { x: 50, y: 25 },
  },
  neck: {
    path: 'M44,42 L44,50 L56,50 L56,42 C53,44 47,44 44,42',
    label: 'Neck',
    labelPos: { x: 50, y: 46 },
  },
  'shoulders-left': {
    path: 'M36,50 C28,52 24,58 24,66 L24,72 C26,70 30,66 36,64 L36,50',
    label: 'Shoulder',
    labelPos: { x: 30, y: 60 },
  },
  'shoulders-right': {
    path: 'M64,50 C72,52 76,58 76,66 L76,72 C74,70 70,66 64,64 L64,50',
    label: 'Shoulder',
    labelPos: { x: 70, y: 60 },
  },
  'chest-left': {
    path: 'M36,52 L36,72 C42,76 48,76 50,74 L50,52 C46,50 40,50 36,52',
    label: 'Chest',
    labelPos: { x: 43, y: 64 },
  },
  'chest-right': {
    path: 'M64,52 L64,72 C58,76 52,76 50,74 L50,52 C54,50 60,50 64,52',
    label: 'Chest',
    labelPos: { x: 57, y: 64 },
  },
  'biceps-left': {
    path: 'M24,74 L20,98 C20,102 22,104 26,104 L30,104 C32,100 34,94 36,84 L36,66 C30,68 26,72 24,74',
    label: 'Bicep',
    labelPos: { x: 26, y: 88 },
  },
  'biceps-right': {
    path: 'M76,74 L80,98 C80,102 78,104 74,104 L70,104 C68,100 66,94 64,84 L64,66 C70,68 74,72 76,74',
    label: 'Bicep',
    labelPos: { x: 74, y: 88 },
  },
  'forearms-left': {
    path: 'M20,106 L16,134 L18,136 L28,136 L30,134 L30,106 L20,106',
    label: 'Forearm',
    labelPos: { x: 23, y: 120 },
  },
  'forearms-right': {
    path: 'M80,106 L84,134 L82,136 L72,136 L70,134 L70,106 L80,106',
    label: 'Forearm',
    labelPos: { x: 77, y: 120 },
  },
  core: {
    path: 'M42,76 L42,116 C42,120 46,124 50,124 C54,124 58,120 58,116 L58,76 C54,78 46,78 42,76',
    label: 'Core',
    labelPos: { x: 50, y: 100 },
  },
  'obliques-left': {
    path: 'M36,74 L36,110 C36,116 38,120 42,122 L42,76 C40,76 38,75 36,74',
    label: 'Oblique',
    labelPos: { x: 38, y: 96 },
  },
  'obliques-right': {
    path: 'M64,74 L64,110 C64,116 62,120 58,122 L58,76 C60,76 62,75 64,74',
    label: 'Oblique',
    labelPos: { x: 62, y: 96 },
  },
  'quads-left': {
    path: 'M38,126 L34,180 L48,180 L50,126 C46,128 42,128 38,126',
    label: 'Quad',
    labelPos: { x: 41, y: 154 },
  },
  'quads-right': {
    path: 'M62,126 L66,180 L52,180 L50,126 C54,128 58,128 62,126',
    label: 'Quad',
    labelPos: { x: 59, y: 154 },
  },
  'adductors-left': {
    path: 'M44,126 L44,160 L48,160 L50,126 L44,126',
    label: '',
    labelPos: { x: 46, y: 142 },
  },
  'adductors-right': {
    path: 'M56,126 L56,160 L52,160 L50,126 L56,126',
    label: '',
    labelPos: { x: 54, y: 142 },
  },
  'calves-left': {
    path: 'M36,182 L34,220 L44,220 L46,182 L36,182',
    label: 'Calf',
    labelPos: { x: 40, y: 200 },
  },
  'calves-right': {
    path: 'M64,182 L66,220 L56,220 L54,182 L64,182',
    label: 'Calf',
    labelPos: { x: 60, y: 200 },
  },
};

// Detailed anatomical SVG paths for back view
const backMuscles = {
  head: {
    path: 'M50,8 C42,8 36,14 36,24 C36,34 42,42 50,42 C58,42 64,34 64,24 C64,14 58,8 50,8',
    label: 'Head',
    labelPos: { x: 50, y: 25 },
  },
  neck: {
    path: 'M44,42 L44,50 L56,50 L56,42 C53,44 47,44 44,42',
    label: 'Neck',
    labelPos: { x: 50, y: 46 },
  },
  traps: {
    path: 'M36,50 L36,62 L44,58 L50,56 L56,58 L64,62 L64,50 C58,48 52,48 50,48 C48,48 42,48 36,50',
    label: 'Traps',
    labelPos: { x: 50, y: 54 },
  },
  'shoulders-left': {
    path: 'M36,52 C28,54 24,60 24,68 L24,74 C26,72 30,68 36,66 L36,52',
    label: 'Rear Delt',
    labelPos: { x: 30, y: 62 },
  },
  'shoulders-right': {
    path: 'M64,52 C72,54 76,60 76,68 L76,74 C74,72 70,68 64,66 L64,52',
    label: 'Rear Delt',
    labelPos: { x: 70, y: 62 },
  },
  'back-left': {
    path: 'M36,62 L32,90 C32,96 36,102 42,106 L42,70 C40,68 38,66 36,62',
    label: 'Lat',
    labelPos: { x: 36, y: 84 },
  },
  'back-right': {
    path: 'M64,62 L68,90 C68,96 64,102 58,106 L58,70 C60,68 62,66 64,62',
    label: 'Lat',
    labelPos: { x: 64, y: 84 },
  },
  'back-mid': {
    path: 'M44,58 L44,90 C46,92 50,94 50,94 C50,94 54,92 56,90 L56,58 L50,56 L44,58',
    label: 'Mid Back',
    labelPos: { x: 50, y: 74 },
  },
  'lower-back': {
    path: 'M44,92 L44,120 C46,122 50,124 50,124 C50,124 54,122 56,120 L56,92 C54,94 50,96 50,96 C50,96 46,94 44,92',
    label: 'Lower Back',
    labelPos: { x: 50, y: 108 },
  },
  'triceps-left': {
    path: 'M24,76 L20,100 C20,104 22,106 26,106 L30,106 C32,102 34,96 36,86 L36,68 C30,70 26,74 24,76',
    label: 'Tricep',
    labelPos: { x: 26, y: 90 },
  },
  'triceps-right': {
    path: 'M76,76 L80,100 C80,104 78,106 74,106 L70,106 C68,102 66,96 64,86 L64,68 C70,70 74,74 76,76',
    label: 'Tricep',
    labelPos: { x: 74, y: 90 },
  },
  'forearms-left': {
    path: 'M20,108 L16,136 L18,138 L28,138 L30,136 L30,108 L20,108',
    label: 'Forearm',
    labelPos: { x: 23, y: 122 },
  },
  'forearms-right': {
    path: 'M80,108 L84,136 L82,138 L72,138 L70,136 L70,108 L80,108',
    label: 'Forearm',
    labelPos: { x: 77, y: 122 },
  },
  'glutes-left': {
    path: 'M38,122 L34,140 C36,144 42,146 50,146 L50,124 C46,126 42,126 38,122',
    label: 'Glute',
    labelPos: { x: 42, y: 134 },
  },
  'glutes-right': {
    path: 'M62,122 L66,140 C64,144 58,146 50,146 L50,124 C54,126 58,126 62,122',
    label: 'Glute',
    labelPos: { x: 58, y: 134 },
  },
  'hamstrings-left': {
    path: 'M36,148 L34,190 L46,190 L48,148 C44,150 40,150 36,148',
    label: 'Hamstring',
    labelPos: { x: 40, y: 168 },
  },
  'hamstrings-right': {
    path: 'M64,148 L66,190 L54,190 L52,148 C56,150 60,150 64,148',
    label: 'Hamstring',
    labelPos: { x: 60, y: 168 },
  },
  'calves-left': {
    path: 'M36,192 L34,230 L46,230 L48,192 C44,194 40,194 36,192',
    label: 'Calf',
    labelPos: { x: 40, y: 210 },
  },
  'calves-right': {
    path: 'M64,192 L66,230 L54,230 L52,192 C56,194 60,194 64,192',
    label: 'Calf',
    labelPos: { x: 60, y: 210 },
  },
};

// Map specific muscle parts to general muscle groups
const muscleGroupMapping: Record<string, string> = {
  'shoulders-left': 'shoulders',
  'shoulders-right': 'shoulders',
  'chest-left': 'chest',
  'chest-right': 'chest',
  'biceps-left': 'biceps',
  'biceps-right': 'biceps',
  'triceps-left': 'triceps',
  'triceps-right': 'triceps',
  'forearms-left': 'forearms',
  'forearms-right': 'forearms',
  'obliques-left': 'core',
  'obliques-right': 'core',
  'quads-left': 'quads',
  'quads-right': 'quads',
  'adductors-left': 'quads',
  'adductors-right': 'quads',
  'calves-left': 'calves',
  'calves-right': 'calves',
  'back-left': 'back',
  'back-right': 'back',
  'back-mid': 'back',
  'lower-back': 'back',
  'glutes-left': 'glutes',
  'glutes-right': 'glutes',
  'hamstrings-left': 'hamstrings',
  'hamstrings-right': 'hamstrings',
  head: 'neck',
  neck: 'neck',
  traps: 'back',
};

function MusclePath({
  id,
  pathData,
  rank,
  isSelected,
  onClick,
  showLabel,
  score,
}: {
  id: string;
  pathData: { path: string; label: string; labelPos: { x: number; y: number } };
  rank: RankTier | null;
  isSelected: boolean;
  onClick?: () => void;
  showLabel?: boolean;
  score?: number;
}) {
  const colors = rank ? getRankColor(rank) : null;
  const fillColor = colors ? colors.fill : 'transparent';
  const strokeColor = isSelected ? '#ffffff' : (colors ? colors.stroke : '#60a5fa');
  const strokeWidth = isSelected ? 2 : (rank ? 1.2 : 0.8);
  const glowEffect = colors?.glow;

  return (
    <g
      onClick={onClick}
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:opacity-80'
      )}
    >
      <path
        d={pathData.path}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        className="transition-all duration-300"
        style={{
          filter: glowEffect ? `drop-shadow(${glowEffect})` : undefined,
        }}
      />
      {showLabel && pathData.label && rank && (
        <text
          x={pathData.labelPos.x}
          y={pathData.labelPos.y}
          textAnchor="middle"
          fontSize="4"
          fill={rank === 'gold' || rank === 'silver' ? '#000' : '#fff'}
          fontWeight="600"
          className="pointer-events-none"
          style={{
            textShadow: '0 0 2px rgba(0,0,0,0.5)',
          }}
        >
          {score ? Math.round(score) : ''}
        </text>
      )}
    </g>
  );
}

export function AnatomyVisualization({
  muscleGroups,
  muscleScores,
  onMuscleClick,
  selectedMuscle,
  className,
  showLabels = false,
}: AnatomyVisualizationProps) {
  const getScore = (muscleId: string): number => {
    const groupName = muscleGroupMapping[muscleId] || muscleId;
    
    if (muscleScores && muscleScores[groupName.toLowerCase()] !== undefined) {
      return muscleScores[groupName.toLowerCase()];
    }
    
    if (muscleGroups) {
      const group = muscleGroups.find(
        (m) => m.name.toLowerCase() === groupName.toLowerCase()
      );
      return group?.score || 0;
    }
    
    return 0;
  };

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
    <div className={cn('flex gap-4 sm:gap-8 justify-center items-start', className)}>
      {/* Front view */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground mb-2 font-medium">Front</span>
        <svg 
          viewBox="0 0 100 230" 
          className="w-28 h-64 sm:w-36 sm:h-80"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          
          <path
            d="M50,8 C40,8 34,16 34,26 C34,36 40,44 50,44 C60,44 66,36 66,26 C66,16 60,8 50,8
               M44,44 L44,50 L36,50 C26,52 22,60 22,70 L18,138 L32,138 L36,108 L36,126 
               C36,128 40,130 50,130 C60,130 64,128 64,126 L64,108 L68,138 L82,138 L78,70 
               C78,60 74,52 64,50 L56,50 L56,44
               M36,130 L32,222 L48,222 L50,130
               M64,130 L68,222 L52,222 L50,130"
            fill="url(#bodyGradient)"
            stroke="#60a5fa"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
          
          {Object.entries(frontMuscles).map(([id, pathData]) => {
            const data = getMuscleData(id);
            return (
              <MusclePath
                key={id}
                id={id}
                pathData={pathData}
                rank={data?.rank || null}
                score={data?.score}
                isSelected={isSelected(id)}
                onClick={() => handleClick(id)}
                showLabel={showLabels}
              />
            );
          })}
        </svg>
      </div>

      {/* Back view */}
      <div className="flex flex-col items-center">
        <span className="text-xs text-muted-foreground mb-2 font-medium">Back</span>
        <svg 
          viewBox="0 0 100 240" 
          className="w-28 h-64 sm:w-36 sm:h-80"
          style={{ overflow: 'visible' }}
        >
          <path
            d="M50,8 C40,8 34,16 34,26 C34,36 40,44 50,44 C60,44 66,36 66,26 C66,16 60,8 50,8
               M44,44 L44,50 L36,50 C26,52 22,60 22,70 L18,140 L32,140 L36,110 L36,148 
               C36,150 40,152 50,152 C60,152 64,150 64,148 L64,110 L68,140 L82,140 L78,70 
               C78,60 74,52 64,50 L56,50 L56,44
               M36,148 L32,232 L48,232 L50,148
               M64,148 L68,232 L52,232 L50,148"
            fill="url(#bodyGradient)"
            stroke="#60a5fa"
            strokeWidth="0.5"
            strokeOpacity="0.3"
          />
          
          {Object.entries(backMuscles).map(([id, pathData]) => {
            const data = getMuscleData(id);
            return (
              <MusclePath
                key={id}
                id={id}
                pathData={pathData}
                rank={data?.rank || null}
                score={data?.score}
                isSelected={isSelected(id)}
                onClick={() => handleClick(id)}
                showLabel={showLabels}
              />
            );
          })}
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
    { label: 'Champion', rank: 'champion' },
    { label: 'Elite', rank: 'elite' },
    { label: 'Unreal', rank: 'unreal' },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2 justify-center', className)}>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm border border-blue-400" style={{ backgroundColor: 'transparent' }} />
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

import { cn } from '@/lib/utils';
import { scoreBgColor } from '@/lib/utils';

interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
  className?: string;
}

export function ScoreBar({ label, value, max = 100, className }: ScoreBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[11px] font-medium text-gray-700">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', scoreBgColor(value))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

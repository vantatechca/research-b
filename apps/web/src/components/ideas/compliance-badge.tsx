import { cn } from '@/lib/utils';
import { complianceBgColor } from '@/lib/utils';

interface ComplianceBadgeProps {
  flag: string;
  className?: string;
}

const flagLabels: Record<string, string> = {
  green: 'Compliant',
  yellow: 'Review Needed',
  red: 'High Risk',
};

const dotColors: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export function ComplianceBadge({ flag, className }: ComplianceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        complianceBgColor(flag),
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[flag])} />
      {flagLabels[flag]}
    </span>
  );
}

import {
  MessageSquare,
  Video,
  TrendingUp,
  Rss,
  Globe,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

const platformConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  reddit: {
    icon: MessageSquare,
    label: 'Reddit',
    color: 'text-orange-500',
  },
  youtube: {
    icon: Video,
    label: 'YouTube',
    color: 'text-red-500',
  },
  google_trends: {
    icon: TrendingUp,
    label: 'Google Trends',
    color: 'text-blue-500',
  },
  rss: {
    icon: Rss,
    label: 'RSS',
    color: 'text-amber-500',
  },
  bhw: {
    icon: Globe,
    label: 'BHW',
    color: 'text-gray-600',
  },
  etsy: {
    icon: ShoppingBag,
    label: 'Etsy',
    color: 'text-orange-600',
  },
  whop: {
    icon: Store,
    label: 'Whop',
    color: 'text-purple-500',
  },
};

interface PlatformIconsProps {
  platforms: string[];
  className?: string;
}

export function PlatformIcons({ platforms, className }: PlatformIconsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {platforms.map((platform) => {
        const config = platformConfig[platform];
        if (!config) return null;

        const Icon = config.icon;

        return (
          <Tooltip key={platform} content={config.label}>
            <span
              className={cn(
                'inline-flex items-center justify-center rounded p-0.5',
                config.color
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          </Tooltip>
        );
      })}
    </div>
  );
}

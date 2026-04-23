'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  Archive,
} from 'lucide-react';
import { cn, scoreColor, timeAgo } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { ScoreBar } from '@/components/ideas/score-bar';
import { ComplianceBadge } from '@/components/ideas/compliance-badge';
import { PlatformIcons } from '@/components/ideas/platform-icons';

export interface IdeaCardData {
  id: string;
  title: string;
  summary: string;
  slug: string;
  compositeScore: number;
  trendScore?: number;
  demandScore?: number;
  competitionScore?: number;
  feasibilityScore?: number;
  revenuePotentialScore?: number;
  subScores?: {
    label: string;
    value: number;
  }[];
  peptideCategory?: string[] | string;
  peptideCategories?: string[];
  productType?: string[] | string;
  productTypes?: string[];
  complianceFlag: string;
  sourcePlatforms?: string[];
  sources?: string[];
  discoveredAt?: string;
  createdAt?: string;
  starred?: boolean;
  status: string;
}

interface IdeaCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idea: IdeaCardData | any;
  viewMode?: 'grid' | 'list';
  onAction?: (ideaId: string, action: string) => void;
}

export function IdeaCard({ idea, viewMode, onAction }: IdeaCardProps) {
  const router = useRouter();
  const { toggleChat, setChatType, setActiveChatThread, setFilter } = useAppStore();
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Normalize field names for flexibility
  const categories = (Array.isArray(idea.peptideCategories) ? idea.peptideCategories : Array.isArray(idea.peptideCategory) ? idea.peptideCategory : typeof idea.peptideCategory === 'string' ? [idea.peptideCategory] : []) as string[];
  const productTypes = (Array.isArray(idea.productTypes) ? idea.productTypes : Array.isArray(idea.productType) ? idea.productType : typeof idea.productType === 'string' ? [idea.productType] : []) as string[];
  const platforms = (idea.sourcePlatforms || idea.sources || []) as string[];
  const discoveredDate = (idea.discoveredAt || idea.createdAt || new Date().toISOString()) as string;
  const subScores = idea.subScores || [
    { label: 'Trend', value: Number(idea.trendScore) || 0 },
    { label: 'Demand', value: Number(idea.demandScore) || 0 },
    { label: 'Competition', value: Number(idea.competitionScore) || 0 },
    { label: 'Feasibility', value: Number(idea.feasibilityScore) || 0 },
    { label: 'Revenue', value: Number(idea.revenuePotentialScore) || 0 },
  ];

  async function handleAction(action: string) {
    if (actionLoading) return;
    setActionLoading(action);
    try {
      await fetch(`/api/ideas/${idea.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      onAction?.(idea.id, action);
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);async function handleAction(action: string) {
    if (actionLoading) return;
    setActionLoading(action);
    try {
      const res = await fetch(`/api/ideas/${idea.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        console.error('Feedback action failed:', res.status);
        return;
      }

      onAction?.(idea.id, action);

      // Auto-navigate to the corresponding status page
      onAction?.(idea.id, action);

      // Map action to status value and target path
      const statusMap: Record<string, string> = {
        approve: 'approved',
        decline: 'declined',
        star: 'starred',
        archive: 'archived',
      };
      const navigationMap: Record<string, string> = {
        approve: '/ideas/approved',
        decline: '/ideas/declined',
        star: '/ideas/starred',
        archive: '/ideas/archived',
      };

      // Sync the FilterBar status pill with the action
      const newStatus = statusMap[action];
      if (newStatus) {
        setFilter('status', newStatus);
      }

      // Navigate to the corresponding status page
      const targetPath = navigationMap[action];
      if (targetPath) {
        router.push(targetPath);
      }
    } catch (err) {
      console.error('Feedback action error:', err);
    } finally {
      setActionLoading(null);
    }
  }
    }
  }

  function handleChat() {
    setChatType('idea');
    setActiveChatThread(idea.id);
    toggleChat();
  }

  const truncatedSummary =
    idea.summary.length > 140
      ? idea.summary.slice(0, 140) + '...'
      : idea.summary;

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <div className="p-5">
        {/* Top row: score + title area */}
        <div className="flex gap-4">
          {/* Composite score */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <span
              className={cn(
                'text-3xl font-bold leading-none',
                scoreColor(idea.compositeScore)
              )}
            >
              {idea.compositeScore}
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-wider text-gray-400">
              Score
            </span>
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Title */}
            <Link
              href={`/ideas/${idea.slug}`}
              className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1"
            >
              {idea.title}
            </Link>

            {/* Summary */}
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {truncatedSummary}
            </p>

            {/* Tags row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <Badge key={cat} variant="default" className="text-[10px]">
                  {cat}
                </Badge>
              ))}
              {productTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-[10px]">
                  {type}
                </Badge>
              ))}
              <ComplianceBadge flag={idea.complianceFlag} />
            </div>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {subScores.map((sub: { label: string; value: number }) => (
            <ScoreBar key={sub.label} label={sub.label} value={sub.value} />
          ))}
        </div>

        {/* Footer: meta + actions */}
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <PlatformIcons platforms={platforms} />
            <span>{timeAgo(discoveredDate)}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip content="Approve">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-green-600"
                onClick={() => handleAction('approve')}
                disabled={actionLoading === 'approve'}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            </Tooltip>

            <Tooltip content="Decline">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-600"
                onClick={() => handleAction('decline')}
                disabled={actionLoading === 'decline'}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </Tooltip>

            <Tooltip content={idea.starred ? 'Unstar' : 'Star'}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7',
                  idea.starred
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-yellow-500'
                )}
                onClick={() => handleAction('star')}
                disabled={actionLoading === 'star'}
              >
                <Star
                  className={cn('h-4 w-4', idea.starred && 'fill-current')}
                />
              </Button>
            </Tooltip>

            <Tooltip content="Chat about this idea">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                onClick={handleChat}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </Tooltip>

            <Tooltip content="Archive">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-gray-600"
                onClick={() => handleAction('archive')}
                disabled={actionLoading === 'archive'}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </Card>
  );
}

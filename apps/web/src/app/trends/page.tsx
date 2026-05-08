"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  BarChart3,
  Lightbulb,
  Clock,
  CheckCircle2,
  Activity,
  ChevronRight,
  Star,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ───────────────── Types ───────────────── */

interface PlatformVolume {
  week: string;
  volume: number;
}

interface TopIdea {
  id: string;
  title: string;
  slug: string;
  compositeScore: number;
  trendScore: number;
  demandScore: number;
  status: string;
  peptideCategory: string[];
  discoveredAt: string;
}

interface Summary {
  totalIdeas: number;
  pendingIdeas: number;
  approvedIdeas: number;
  recentSignals: number;
  periodDays: number;
}

interface TrendsData {
  topNiche: string;
  summary: Summary;
  topIdeas: TopIdea[];
  redditVolume: PlatformVolume[];
  googleInterest: PlatformVolume[];
  youtubeVolume: PlatformVolume[];
}

/* ───────────────── Helpers ───────────────── */

function relativeTime(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-indigo-600";
  if (score >= 40) return "text-amber-600";
  return "text-gray-500";
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-50 text-green-700 ring-green-200",
  starred:  "bg-blue-50 text-blue-700 ring-blue-200",
  pending:  "bg-gray-50 text-gray-600 ring-gray-200",
  declined: "bg-red-50 text-red-700 ring-red-200",
  archived: "bg-gray-100 text-gray-500 ring-gray-300",
};

function statusStyle(status: string): string {
  return STATUS_STYLES[status] || STATUS_STYLES.pending;
}

/* ───────────────── Page ───────────────── */

export default function TrendsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trends/overview");
      const json = await res.json();
      const tbm = json.trendsByMetric ?? {};
      const toVolume = (
        arr: Array<{ date: string; value: number; count: number }> = []
      ): PlatformVolume[] => arr.map((p) => ({ week: p.date, volume: p.count }));

      setData({
        topNiche: json.topNiche ?? "—",
        summary: {
          totalIdeas:    json.summary?.totalIdeas    ?? 0,
          pendingIdeas:  json.summary?.pendingIdeas  ?? 0,
          approvedIdeas: json.summary?.approvedIdeas ?? 0,
          recentSignals: json.summary?.recentSignals ?? 0,
          periodDays:    json.summary?.periodDays    ?? 30,
        },
        topIdeas: json.topIdeas ?? [],
        redditVolume:   toVolume(tbm.reddit_mentions),
        googleInterest: toVolume(tbm.google_interest),
        youtubeVolume:  toVolume(tbm.youtube_videos),
      });
    } catch {
      // Empty data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trends</h1>
          <p className="mt-1 text-sm text-gray-500">
            Cross-platform peptide trend analysis and keyword tracking.
          </p>
        </div>

        {/* Stat cards */}
        {data && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={<Lightbulb className="h-5 w-5" />}
              iconBg="bg-indigo-50 text-indigo-600"
              label="Total Ideas"
              value={data.summary.totalIdeas.toLocaleString()}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              iconBg="bg-amber-50 text-amber-600"
              label="Pending Review"
              value={data.summary.pendingIdeas.toLocaleString()}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconBg="bg-green-50 text-green-600"
              label="Approved"
              value={data.summary.approvedIdeas.toLocaleString()}
            />
            <StatCard
              icon={<Activity className="h-5 w-5" />}
              iconBg="bg-rose-50 text-rose-600"
              label={`Signals (${data.summary.periodDays}d)`}
              value={data.summary.recentSignals.toLocaleString()}
            />
          </div>
        )}

        {/* Platform volume charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PlatformChart
            title="Reddit Mention Volume"
            data={data?.redditVolume ?? []}
            color="#f97316"
            iconColor="text-orange-500"
            emptyText="No Reddit volume data."
          />
          <PlatformChart
            title="YouTube Video Volume"
            data={data?.youtubeVolume ?? []}
            color="#ef4444"
            iconColor="text-red-500"
            emptyText="No YouTube volume data."
          />
          <PlatformChart
            title="Google Search Interest"
            data={data?.googleInterest ?? []}
            color="#3b82f6"
            iconColor="text-blue-500"
            emptyText="No Google interest data."
          />
        </div>

        {/* Top Scoring Ideas */}
        {data && data.topIdeas.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-indigo-500" />
                Top Scoring Ideas
              </h2>
              <Link
                href="/ideas?sort=discoveredAt:desc"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all →
              </Link>
            </div>
            <Card>
              <ul className="divide-y divide-gray-100">
                {data.topIdeas.map((idea, i) => (
                  <li key={idea.id}>
                    <Link
                      href={`/ideas/${idea.id}`}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="w-6 text-xs font-mono font-medium text-gray-400 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset",
                                statusStyle(idea.status)
                              )}
                            >
                              {idea.status}
                            </span>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {idea.title}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs flex-wrap">
                            {idea.peptideCategory.slice(0, 3).map((cat) => (
                              <span
                                key={cat}
                                className="inline-block bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]"
                              >
                                {cat}
                              </span>
                            ))}
                            <span className="text-gray-400">
                              · {relativeTime(idea.discoveredAt)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={cn(
                              "text-xl font-bold tabular-nums",
                              scoreColor(idea.compositeScore)
                            )}
                          >
                            {Math.round(idea.compositeScore)}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                            T {Math.round(idea.trendScore)} · D{" "}
                            {Math.round(idea.demandScore)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

/* ───────────────── Sub-components ───────────────── */

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("rounded-lg p-2", iconBg)}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-bold text-gray-900 tabular-nums">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformChart({
  title,
  data,
  color,
  iconColor,
  emptyText,
}: {
  title: string;
  data: PlatformVolume[];
  color: string;
  iconColor: string;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className={cn("h-4 w-4", iconColor)} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                  }}
                />
                <Bar dataKey="volume" fill={color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-gray-400">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}
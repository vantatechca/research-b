"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  PlayCircle,
  Star,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { cn, scoreColor, formatNumber, timeAgo } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatsData {
  totalIdeas: number;
  newToday: number;
  approvalRate: number;
  topNiche: string;
}

interface SparklineData {
  keyword: string;
  data: { week: string; value: number }[];
  change: number;
}

interface ActivityItem {
  id: string;
  type: "scrape" | "feedback" | "new_idea";
  message: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Dashboard page                                                     */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic'
 export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [sparklines, setSparklines] = useState<SparklineData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [ideasRes, trendsRes, scrapersRes] = await Promise.all([
        fetch("/api/ideas?limit=1&page=1"),
        fetch("/api/trends/overview"),
        fetch("/api/scrapers/status"),
      ]);

      const ideasData = await ideasRes.json().catch(() => null);
      const trendsData = await trendsRes.json().catch(() => null);
      const scrapersData = await scrapersRes.json().catch(() => null);

      setStats({
        totalIdeas: ideasData?.pagination?.total ?? ideasData?.total ?? 0,
        newToday: ideasData?.newToday ?? 0,
        approvalRate: ideasData?.approvalRate ?? 0,
        topNiche: trendsData?.topNiche ?? "N/A",
      });

      setSparklines(
        (trendsData?.sparklines ?? []).slice(0, 4).map(
          (s: { keyword?: string; data?: { week: string; value: number }[]; change?: number }) => ({
            keyword: s.keyword ?? "Unknown",
            data: s.data ?? [],
            change: s.change ?? 0,
          })
        )
      );

      const recentActivity: ActivityItem[] = [];
      if (scrapersData?.runs) {
        (scrapersData.runs as Array<{
          id: string;
          scraperName: string;
          status: string;
          signalsFound: number;
          ideasGenerated: number;
          startedAt: string;
          completedAt: string | null;
        }>)
          .slice(0, 8)
          .forEach((r) => {
            const verb = r.status === 'completed' ? 'completed' : r.status === 'running' ? 'running' : r.status === 'failed' ? 'failed' : r.status;
            recentActivity.push({
              id: r.id,
              type: "scrape",
              message: `${r.scraperName} scraper ${verb} — ${r.signalsFound} signals, ${r.ideasGenerated} ideas`,
              timestamp: r.completedAt ?? r.startedAt,
            });
          });
      }
      setActivity(recentActivity);
    } catch {
      // Keep empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const runFullScrape = async () => {
    setScraping(true);
    try {
      const scrapers = ["reddit", "youtube", "google_trends", "amazon"];
      await Promise.all(
        scrapers.map((name) =>
          fetch(`/api/scrapers/${name}/run`, { method: "POST" })
        )
      );
      await fetchDashboard();
    } catch {
      // Ignore errors
    } finally {
      setScraping(false);
    }
  };

  /* ---------- stat cards ---------- */

  const statCards = [
    {
      label: "Total Ideas",
      value: stats ? formatNumber(stats.totalIdeas) : "--",
      icon: Lightbulb,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "New Today",
      value: stats ? stats.newToday.toString() : "--",
      icon: Sparkles,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Approval Rate",
      value: stats ? `${stats.approvalRate}%` : "--",
      icon: CheckCircle2,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Top Trending Niche",
      value: stats?.topNiche ?? "--",
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  /* ---------- render ---------- */

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your peptide product intelligence at a glance.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("rounded-lg p-3", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 truncate">
                    {loading ? (
                      <span className="inline-block h-6 w-16 animate-pulse rounded bg-gray-200" />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sparklines */}
        {false && sparklines.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Trending Keywords
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {sparklines.map((s) => (
                <Card key={s.keyword} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {s.keyword}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          s.change >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {s.change >= 0 ? "+" : ""}
                        {s.change}%
                      </span>
                    </div>
                    <div className="h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={s.data}>
                          <XAxis dataKey="week" hide />
                          <Tooltip
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: "none",
                              boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={s.change >= 0 ? "#10b981" : "#ef4444"}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Quick actions + activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quick actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={runFullScrape}
                disabled={scraping}
              >
                {scraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {scraping ? "Running..." : "Run Full Scrape"}
              </Button>
              <Link href="/ideas?sort=composite_score&status=pending">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Star className="h-4 w-4" />
                  Show Today&apos;s Best
                </Button>
              </Link>
              <Link href="/ideas?sort=newest">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Sparkles className="h-4 w-4" />
                  What&apos;s New
                </Button>
              </Link>
              <Link href="/trends">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <TrendingUp className="h-4 w-4" />
                  View Trends
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDashboard}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("h-4 w-4", loading && "animate-spin")}
                />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-1">
                        <span className="block h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                        <span className="block h-2 w-1/3 animate-pulse rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Activity className="h-10 w-10 mb-2" />
                  <p className="text-sm">No recent activity yet.</p>
                  <p className="text-xs mt-1">
                    Run a scrape to get started.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {activity.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          item.type === "scrape" && "bg-blue-50 text-blue-600",
                          item.type === "feedback" && "bg-green-50 text-green-600",
                          item.type === "new_idea" && "bg-violet-50 text-violet-600"
                        )}
                      >
                        {item.type === "scrape" && <RefreshCw className="h-4 w-4" />}
                        {item.type === "feedback" && <CheckCircle2 className="h-4 w-4" />}
                        {item.type === "new_idea" && <Lightbulb className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700">{item.message}</p>
                        <p className="text-xs text-gray-400">
                          {timeAgo(item.timestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/ideas">
            <Button>
              Browse All Ideas
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/rules">
            <Button variant="outline">Manage Golden Rules</Button>
          </Link>
          <Link href="/competitors">
            <Button variant="outline">Competitor Landscape</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

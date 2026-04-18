"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TrendLine {
  keyword: string;
  color: string;
}

interface TrendDataPoint {
  week: string;
  [keyword: string]: string | number;
}

interface RisingKeyword {
  keyword: string;
  interest: number;
  change: number;
  category: string;
}

interface PlatformVolume {
  week: string;
  volume: number;
}

interface TrendsData {
  topNiche: string;
  trendLines: TrendLine[];
  trendData: TrendDataPoint[];
  risingKeywords: RisingKeyword[];
  redditVolume: PlatformVolume[];
  youtubeVolume: PlatformVolume[];
}

/* ------------------------------------------------------------------ */
/*  Trends page                                                        */
/* ------------------------------------------------------------------ */

const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

export default function TrendsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trends/overview");
      const json = await res.json();
      setData({
        topNiche: json.topNiche ?? "N/A",
        trendLines: (json.trendLines ?? []).map(
          (t: { keyword?: string; color?: string }, i: number) => ({
            keyword: t.keyword ?? `Keyword ${i + 1}`,
            color: t.color ?? CHART_COLORS[i % CHART_COLORS.length],
          })
        ),
        trendData: json.trendData ?? [],
        risingKeywords: json.risingKeywords ?? [],
        redditVolume: json.redditVolume ?? [],
        youtubeVolume: json.youtubeVolume ?? [],
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

        {/* Main trend chart */}
        {data && data.trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Keyword Interest Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trendData}>
                    <defs>
                      {data.trendLines.map((line, i) => (
                        <linearGradient
                          key={line.keyword}
                          id={`gradient-${i}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={line.color}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor={line.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
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
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    {data.trendLines.map((line, i) => (
                      <Area
                        key={line.keyword}
                        type="monotone"
                        dataKey={line.keyword}
                        stroke={line.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${i})`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rising keywords */}
        {data && data.risingKeywords.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              Rising Keywords
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.risingKeywords.map((kw) => (
                <Card key={kw.keyword}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {kw.keyword}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {kw.category}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                          kw.change >= 0
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {kw.change >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(kw.change)}%
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-end justify-between text-xs text-gray-500 mb-1">
                        <span>Interest</span>
                        <span className="font-medium text-gray-700">
                          {kw.interest}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${Math.min(kw.interest, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Platform volume charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Reddit mention volume */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                Reddit Mention Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.redditVolume.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.redditVolume}>
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
                      <Bar
                        dataKey="volume"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-gray-400">
                  No Reddit volume data available.
                </p>
              )}
            </CardContent>
          </Card>

          {/* YouTube video volume */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-red-500" />
                YouTube Video Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data && data.youtubeVolume.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.youtubeVolume}>
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
                      <Bar
                        dataKey="volume"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-gray-400">
                  No YouTube volume data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Empty state when no data at all */}
        {data &&
          data.trendData.length === 0 &&
          data.risingKeywords.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-gray-400">
              <TrendingUp className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">No trend data yet</p>
              <p className="mt-1 text-sm">
                Run a scrape to start collecting trend data.
              </p>
            </div>
          )}
      </div>
    </AppLayout>
  );
}

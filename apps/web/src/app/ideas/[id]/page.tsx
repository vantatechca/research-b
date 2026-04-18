"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Star,
  Archive,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ideas/score-bar";
import { ComplianceBadge } from "@/components/ideas/compliance-badge";
import { PlatformIcons } from "@/components/ideas/platform-icons";
import {
  cn,
  scoreColor,
  complianceBgColor,
  timeAgo,
  formatNumber,
} from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Signal {
  id: string;
  platform: string;
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
  collectedAt: string;
}

interface TrendPoint {
  week: string;
  interest: number;
}

interface Competitor {
  name: string;
  platform: string;
  price: string;
  estSales: number;
  rating: number;
}

interface IdeaDetail {
  id: string;
  title: string;
  slug: string;
  productType: string;
  peptideCategory: string;
  compositeScore: number;
  demandScore: number;
  competitionScore: number;
  trendScore: number;
  marginScore: number;
  complianceFlag: string;
  status: string;
  summary: string;
  aiReasoning: string;
  sources: string[];
  signals: Signal[];
  trends: TrendPoint[];
  competitors: Competitor[];
  feedback: { action: string; note: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Idea detail page                                                   */
/* ------------------------------------------------------------------ */

export default function IdeaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<IdeaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIdea = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`);
      if (!res.ok) throw new Error("Idea not found");
      const data = await res.json();
      setIdea(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load idea");
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  useEffect(() => {
    fetchIdea();
  }, [fetchIdea]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await fetch(`/api/ideas/${ideaId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchIdea();
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  /* ---------- Loading / Error states ---------- */

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </AppLayout>
    );
  }

  if (error || !idea) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
          <AlertTriangle className="h-12 w-12 mb-3 text-amber-400" />
          <p className="text-lg font-medium text-gray-700">
            {error ?? "Idea not found"}
          </p>
          <Link href="/ideas" className="mt-4">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ideas
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  /* ---------- Sub-scores ---------- */

  const subScores = [
    { label: "Demand", value: idea.demandScore },
    { label: "Competition", value: idea.competitionScore },
    { label: "Trend Momentum", value: idea.trendScore ?? 0 },
    { label: "Margin Potential", value: idea.marginScore ?? 0 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Link href="/ideas">
              <Button variant="ghost" size="icon" className="mt-0.5">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {idea.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{idea.productType}</Badge>
                <Badge variant="secondary">{idea.peptideCategory}</Badge>
                <ComplianceBadge flag={idea.complianceFlag} />
                <span className="text-xs text-gray-400">
                  Created {timeAgo(idea.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("approve")}
              disabled={actionLoading !== null}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              {actionLoading === "approve" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("decline")}
              disabled={actionLoading !== null}
              className="text-red-700 border-red-300 hover:bg-red-50"
            >
              {actionLoading === "decline" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-3.5 w-3.5" />
              )}
              Decline
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("star")}
              disabled={actionLoading !== null}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              {actionLoading === "star" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Star className="mr-1 h-3.5 w-3.5" />
              )}
              Star
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("archive")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "archive" ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="mr-1 h-3.5 w-3.5" />
              )}
              Archive
            </Button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: scores + summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Composite score hero */}
            <Card>
              <CardContent className="flex items-center gap-6 p-6">
                <div
                  className={cn(
                    "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white",
                    idea.compositeScore >= 70
                      ? "bg-green-500"
                      : idea.compositeScore >= 40
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                >
                  {idea.compositeScore}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                    Composite Score
                  </p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-3">
                    {idea.summary}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sub-scores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subScores.map((s) => (
                  <ScoreBar key={s.label} label={s.label} value={s.value} />
                ))}
              </CardContent>
            </Card>

            {/* AI Reasoning */}
            {idea.aiReasoning && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                    {idea.aiReasoning}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Trend chart */}
            {idea.trends && idea.trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    12-Week Interest Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={idea.trends}>
                        <defs>
                          <linearGradient
                            id="trendGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6366f1"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6366f1"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#f1f5f9"
                        />
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
                        <Area
                          type="monotone"
                          dataKey="interest"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="url(#trendGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evidence / signals */}
            <Card>
              <CardHeader>
                <button
                  onClick={() => setEvidenceOpen(!evidenceOpen)}
                  className="flex w-full items-center justify-between"
                >
                  <CardTitle className="text-base">
                    Evidence Signals ({idea.signals?.length ?? 0})
                  </CardTitle>
                  {evidenceOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </CardHeader>
              {evidenceOpen && (
                <CardContent>
                  {!idea.signals || idea.signals.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No signals collected yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {idea.signals.map((signal) => (
                        <li
                          key={signal.id}
                          className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <PlatformIcons
                            platforms={[signal.platform]}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {signal.title}
                              </p>
                              <span
                                className={cn(
                                  "text-xs font-semibold",
                                  scoreColor(signal.relevanceScore)
                                )}
                              >
                                {signal.relevanceScore}%
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                              {signal.snippet}
                            </p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                              <span>{timeAgo(signal.collectedAt)}</span>
                              {signal.url && (
                                <a
                                  href={signal.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-700"
                                >
                                  View source
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right column: competitors + actions */}
          <div className="space-y-6">
            {/* Deep Dive + Draft Spec */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <Button className="w-full justify-start gap-2">
                  <Sparkles className="h-4 w-4" />
                  Deep Dive Analysis
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Draft Product Spec
                </Button>
              </CardContent>
            </Card>

            {/* Competitor analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Competitor Snapshot
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!idea.competitors || idea.competitors.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No competitor data available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {idea.competitors.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-gray-100 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800">
                            {c.name}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {c.platform}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-500">
                          <div>
                            <span className="block text-gray-400">Price</span>
                            <span className="font-medium text-gray-700">
                              {c.price}
                            </span>
                          </div>
                          <div>
                            <span className="block text-gray-400">
                              Est. Sales
                            </span>
                            <span className="font-medium text-gray-700">
                              {formatNumber(c.estSales)}
                            </span>
                          </div>
                          <div>
                            <span className="block text-gray-400">Rating</span>
                            <span className="font-medium text-gray-700">
                              {c.rating}/5
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(idea.sources ?? []).map((src) => (
                    <Badge key={src} variant="secondary">
                      {src}
                    </Badge>
                  ))}
                  {(!idea.sources || idea.sources.length === 0) && (
                    <p className="text-sm text-gray-400">No sources listed.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Feedback history */}
            {idea.feedback && idea.feedback.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Feedback History</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {idea.feedback.map((fb, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span
                          className={cn(
                            "mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full",
                            fb.action === "approve" && "bg-green-500",
                            fb.action === "decline" && "bg-red-500",
                            fb.action === "star" && "bg-amber-500",
                            fb.action === "archive" && "bg-gray-400"
                          )}
                        />
                        <div>
                          <span className="font-medium capitalize text-gray-700">
                            {fb.action}
                          </span>
                          {fb.note && (
                            <span className="text-gray-500">
                              {" "}
                              &mdash; {fb.note}
                            </span>
                          )}
                          <span className="block text-xs text-gray-400 mt-0.5">
                            {timeAgo(fb.createdAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

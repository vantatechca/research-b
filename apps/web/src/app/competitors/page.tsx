"use client";
export const dynamic = "force-dynamic";
import { Fragment, useEffect, useState, useCallback } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart3,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Competitor {
  id: string;
  name: string;
  creator: string;
  platform: string;
  price: string;
  estSales: number;
  category: string;
  rating: number;
  url?: string;
  description?: string;
  ingredients?: string[];
  launchDate?: string;
}

/* ------------------------------------------------------------------ */
/*  Competitors page                                                   */
/* ------------------------------------------------------------------ */

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gapLoading, setGapLoading] = useState(false);

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/competitors");
      const data = await res.json();
      setCompetitors(data.competitors ?? data ?? []);
    } catch {
      setCompetitors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const runGapAnalysis = async () => {
    setGapLoading(true);
    try {
      await fetch("/api/competitors/gap-analysis", { method: "POST" });
    } catch {
      // Ignore
    } finally {
      setGapLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filtered = competitors.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.creator.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase()) ||
      c.platform.toLowerCase().includes(search.toLowerCase())
  );

  const ratingStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="text-amber-500 text-xs">
        {"*".repeat(full)}
        {half && "*"}
        <span className="text-gray-300">
          {"*".repeat(5 - full - (half ? 1 : 0))}
        </span>
        <span className="ml-1 text-gray-500">{rating.toFixed(1)}</span>
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Competitors</h1>
            <p className="mt-1 text-sm text-gray-500">
              Peptide product competitor landscape analysis.
            </p>
          </div>
          <Button
            onClick={runGapAnalysis}
            disabled={gapLoading}
          >
            {gapLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Gap Analysis
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search competitors..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-gray-400">
            <ShieldAlert className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No competitors found</p>
            <p className="mt-1 text-sm">
              {search
                ? "Try a different search term."
                : "Run a scrape to discover competitors."}
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Creator
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Platform
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">
                        Est. Sales
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        Category
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">
                        Rating
                      </th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((c) => (
                      <Fragment key={c.id}>
                        <tr
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-gray-50/60",
                            expandedId === c.id && "bg-indigo-50/40"
                          )}
                          onClick={() => toggleExpand(c.id)}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {c.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.creator}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-xs">
                              {c.platform}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {c.price}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatNumber(c.estSales)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.category}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ratingStars(c.rating)}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {expandedId === c.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </td>
                        </tr>
                        {expandedId === c.id && (
                          <tr key={`${c.id}-detail`}>
                            <td
                              colSpan={8}
                              className="bg-gray-50/80 px-6 py-4"
                            >
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {c.description && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                                      Description
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      {c.description}
                                    </p>
                                  </div>
                                )}
                                {c.ingredients &&
                                  c.ingredients.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                                        Key Ingredients
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {c.ingredients.map((ing) => (
                                          <Badge
                                            key={ing}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {ing}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                {c.launchDate && (
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                                      Launch Date
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      {new Date(
                                        c.launchDate
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                )}
                                {c.url && (
                                  <div>
                                    <a
                                      href={c.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                                    >
                                      View listing
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

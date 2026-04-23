"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Inbox, LayoutGrid, List } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { IdeaCard } from "@/components/ideas/idea-card";
import { FilterBar } from "@/components/ideas/filter-bar";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Idea {
  id: string;
  title: string;
  slug: string;
  productType: string[];
  peptideCategory: string[];
  subNiche?: string[];
  compositeScore: number;
  trendScore: number;
  demandScore: number;
  competitionScore: number;
  feasibilityScore?: number;
  revenuePotentialScore?: number;
  complianceFlag: string;
  status: string;
  summary: string;
  sourceUrls?: string[];
  sourcePlatforms?: string[];
  discoveredAt: string;
  lastUpdated?: string;
}

/* ------------------------------------------------------------------ */
/*  Ideas feed page                                                    */
/* ------------------------------------------------------------------ */

function IdeasPageContent() {
  const searchParams = useSearchParams();
  const filters = useAppStore((s) => s.filters);

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const LIMIT = 20;

  const buildQuery = useCallback(
    (pg: number) => {
      const params = new URLSearchParams();
      params.set("page", pg.toString());
      params.set("limit", LIMIT.toString());

      // Use URL params first, then store filters
      const status = searchParams.get("status") ?? filters.status;
      if (status && status !== "all") params.set("status", status);

      // sortBy in store uses "field:order" format (e.g. "compositeScore:desc")
      const sortCombined = searchParams.get("sort") ?? filters.sortBy;
      if (sortCombined) {
        const [sortField, sortOrder] = sortCombined.includes(":")
          ? sortCombined.split(":")
          : [sortCombined, "desc"];
        params.set("sortBy", sortField);
        params.set("sortOrder", sortOrder);
      }

      if (filters.scoreRange[0] > 0)
        params.set("minScore", filters.scoreRange[0].toString());
      if (filters.scoreRange[1] < 100)
        params.set("maxScore", filters.scoreRange[1].toString());
      if (filters.compliance && filters.compliance !== "all")
        params.set("compliance", filters.compliance);
      // API expects singular names + single value. Use first selected filter if multiple.
      if (filters.productTypes.length)
        params.set("productType", filters.productTypes[0]);
      if (filters.peptideCategories.length)
        params.set("peptideCategory", filters.peptideCategories[0]);
      if (filters.sources.length)
        params.set("sourcePlatform", filters.sources[0]);

      return params.toString();
    },
    [searchParams, filters]
  );

  const fetchIdeas = useCallback(
    async (pg: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await fetch(`/api/ideas?${buildQuery(pg)}`);
        const data = await res.json();

        const items: Idea[] = data.ideas ?? data.items ?? [];
        setTotal(data.pagination?.total ?? data.total ?? items.length);

        if (append) {
          setIdeas((prev) => [...prev, ...items]);
        } else {
          setIdeas(items);
        }
      } catch {
        if (!append) setIdeas([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery]
  );

  // Re-fetch on filter change
  useEffect(() => {
    setPage(1);
    fetchIdeas(1);
  }, [fetchIdeas]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchIdeas(nextPage, true);
  };

  const hasMore = ideas.length < total;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ideas</h1>
            <p className="mt-1 text-sm text-gray-500">
              {loading
                ? "Loading ideas..."
                : `${total} idea${total !== 1 ? "s" : ""} found`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <FilterBar />

        {/* Idea cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-gray-400">
            <Inbox className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No ideas found</p>
            <p className="mt-1 text-sm">
              Try adjusting your filters or run a new scrape.
            </p>
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                  : "space-y-4"
              }
            >
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} viewMode={viewMode} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load More (${ideas.length} of ${total})`
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function IdeasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>}>
      <IdeasPageContent />
    </Suspense>
  );
}
export { IdeasPageContent };
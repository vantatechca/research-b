'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'starred', label: 'Starred' },
  { value: 'declined', label: 'Declined' },
  { value: 'archived', label: 'Archived' },
];

const complianceOptions = [
  { value: 'all', label: 'All Compliance' },
  { value: 'green', label: 'Compliant' },
  { value: 'yellow', label: 'Review Needed' },
  { value: 'red', label: 'High Risk' },
];

// Matches API sort field whitelist: compositeScore, trendScore, demandScore,
// competitionScore, discoveredAt, title
const sortOptions = [
  { value: 'compositeScore:desc', label: 'Highest Score' },
  { value: 'compositeScore:asc', label: 'Lowest Score' },
  { value: 'discoveredAt:desc', label: 'Newest First' },
  { value: 'discoveredAt:asc', label: 'Oldest First' },
  { value: 'trendScore:desc', label: 'Top Trending' },
  { value: 'demandScore:desc', label: 'Highest Demand' },
  { value: 'title:asc', label: 'Title (A–Z)' },
];

// Product types that actually exist in the DB
const productTypeOptions = [
  { value: 'saas', label: 'SaaS / Tool' },
  { value: 'calculator', label: 'Calculator' },
  { value: 'ai_tool', label: 'AI Tool' },
  { value: 'ebook', label: 'Ebook' },
  { value: 'course', label: 'Course' },
  { value: 'membership', label: 'Membership' },
  { value: 'community', label: 'Community' },
  { value: 'template', label: 'Template' },
  { value: 'audio', label: 'Audio' },
  { value: 'tool', label: 'Tool' },
];

// Common peptide categories (extend as needed)
const peptideCategoryOptions = [
  { value: 'BPC-157', label: 'BPC-157' },
  { value: 'CJC-1295', label: 'CJC-1295' },
  { value: 'ipamorelin', label: 'Ipamorelin' },
  { value: 'GHK-Cu', label: 'GHK-Cu' },
  { value: 'thymosin-alpha-1', label: 'Thymosin α-1' },
  { value: 'semaglutide', label: 'Semaglutide' },
  { value: 'tirzepatide', label: 'Tirzepatide' },
  { value: 'epithalon', label: 'Epithalon' },
  { value: 'PT-141', label: 'PT-141' },
  { value: 'general', label: 'General' },
];

export function FilterBar() {
  const { filters, setFilter, resetFilters } = useAppStore();

  function toggleProductType(type: string) {
    const current = filters.productTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFilter('productTypes', next);
  }

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.scoreRange[0] !== 0 ||
    filters.scoreRange[1] !== 100 ||
    filters.productTypes.length > 0 ||
    (filters.peptideCategories?.length ?? 0) > 0 ||
    filters.compliance !== 'all' ||
    filters.sortBy !== 'compositeScore:desc';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start gap-4">
        {/* Status pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </label>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter('status', opt.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filters.status === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Score range */}
        <div className="w-40 space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Min Score
          </label>
          <Slider
            min={0}
            max={100}
            value={filters.scoreRange[0]}
            onValueChange={(v) =>
              setFilter('scoreRange', [v, filters.scoreRange[1]])
            }
            showValue
          />
        </div>

        {/* Product types */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Product Type
          </label>
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {productTypeOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.productTypes.includes(opt.value)}
                  onChange={() => toggleProductType(opt.value)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-600">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Peptide category */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Peptide
          </label>
          <Select
            options={[
              { value: '', label: 'All Peptides' },
              ...peptideCategoryOptions,
            ]}
            value={filters.peptideCategories?.[0] ?? ''}
            onChange={(e) =>
              setFilter(
                'peptideCategories',
                e.target.value ? [e.target.value] : []
              )
            }
            className="h-8 text-xs"
          />
        </div>

        {/* Compliance */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Compliance
          </label>
          <Select
            options={complianceOptions}
            value={filters.compliance}
            onChange={(e) => setFilter('compliance', e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Sort By
          </label>
          <Select
            options={sortOptions}
            value={filters.sortBy}
            onChange={(e) => setFilter('sortBy', e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <div className="flex items-end self-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-gray-500"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
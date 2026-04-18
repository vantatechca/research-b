// Scoring Engine - Computes composite scores for ideas based on sub-scores, golden rules, and learned preferences

import prisma from '@/lib/db';

const SCORE_WEIGHTS = {
  trend: 0.20,
  demand: 0.25,
  competition: 0.20,
  feasibility: 0.15,
  revenue: 0.20,
};

interface SubScores {
  trend: number;
  demand: number;
  competition: number;
  feasibility: number;
  revenue: number;
}

interface GoldenRule {
  ruleType: string;
  ruleText: string;
  weight: number;
  isActive: boolean;
}

interface LearnedPreference {
  preferenceKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preferenceValue: any;
  confidence: number;
}

/**
 * Calculate composite score from sub-scores
 */
export function calculateCompositeScore(subScores: SubScores): number {
  const raw =
    subScores.trend * SCORE_WEIGHTS.trend +
    subScores.demand * SCORE_WEIGHTS.demand +
    subScores.competition * SCORE_WEIGHTS.competition +
    subScores.feasibility * SCORE_WEIGHTS.feasibility +
    subScores.revenue * SCORE_WEIGHTS.revenue;

  return Math.round(Math.max(0, Math.min(100, raw)) * 100) / 100;
}

/**
 * Apply golden rules adjustments to a score
 */
export function applyGoldenRules(
  score: number,
  ideaAttributes: {
    productType: string[];
    complianceFlag: string;
    subNiche: string[];
    title: string;
    summary: string;
  },
  rules: GoldenRule[]
): number {
  let adjustedScore = score;

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const ruleText = rule.ruleText.toLowerCase();
    const ideaText = `${ideaAttributes.title} ${ideaAttributes.summary} ${ideaAttributes.productType.join(' ')} ${ideaAttributes.subNiche.join(' ')}`.toLowerCase();

    switch (rule.ruleType) {
      case 'must_have': {
        // Check if idea matches must_have criteria
        const matches = checkRuleMatch(ruleText, ideaText, ideaAttributes);
        if (matches) {
          adjustedScore *= (1 + 0.20 * rule.weight); // Boost by up to 20%
        }
        break;
      }
      case 'must_avoid': {
        const matches = checkRuleMatch(ruleText, ideaText, ideaAttributes);
        if (matches) {
          adjustedScore *= 0.1; // Heavily penalize (effectively auto-archive)
        }
        break;
      }
      case 'prefer': {
        const matches = checkRuleMatch(ruleText, ideaText, ideaAttributes);
        if (matches) {
          adjustedScore *= (1 + 0.10 * rule.weight); // Moderate boost
        }
        break;
      }
      case 'deprioritize': {
        const matches = checkRuleMatch(ruleText, ideaText, ideaAttributes);
        if (matches) {
          adjustedScore *= (1 - 0.15 * rule.weight); // Moderate penalty
        }
        break;
      }
    }
  }

  return Math.round(Math.max(0, Math.min(100, adjustedScore)) * 100) / 100;
}

/**
 * Check if a rule text matches idea attributes
 */
function checkRuleMatch(
  ruleText: string,
  ideaText: string,
  attributes: { productType: string[]; complianceFlag: string; subNiche: string[] }
): boolean {
  // Keyword-based matching
  const keywords = extractKeywords(ruleText);
  const matchCount = keywords.filter(kw => ideaText.includes(kw)).length;

  // Check specific attribute matches
  if (ruleText.includes('saas') && attributes.productType.includes('saas')) return true;
  if (ruleText.includes('ebook') && attributes.productType.includes('ebook')) return true;
  if (ruleText.includes('course') && attributes.productType.includes('course')) return true;
  if (ruleText.includes('calculator') && attributes.productType.includes('calculator')) return true;
  if (ruleText.includes('recurring') && (attributes.productType.includes('saas') || attributes.productType.includes('membership'))) return true;
  if (ruleText.includes('medical') && attributes.complianceFlag === 'red') return true;
  if (ruleText.includes('printable') && attributes.productType.includes('template')) return true;

  return matchCount >= Math.max(1, Math.floor(keywords.length * 0.4));
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'that', 'this', 'these', 'those', 'my', 'your', 'no', 'not', 'or', 'and', 'but', 'if']);
  return text.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Apply learned preferences to adjust score
 */
export function applyLearnedPreferences(
  score: number,
  ideaAttributes: { productType: string[]; subNiche: string[] },
  preferences: LearnedPreference[]
): number {
  let adjustedScore = score;

  for (const pref of preferences) {
    const value = pref.preferenceValue as Record<string, number | string>;
    const direction = value.direction === 'positive' ? 1 : -1;
    const adjustmentFactor = pref.confidence * 0.1 * direction;

    // Match preference to idea
    if (pref.preferenceKey.includes('saas') && ideaAttributes.productType.includes('saas')) {
      adjustedScore *= (1 + adjustmentFactor);
    }
    if (pref.preferenceKey.includes('ebook') && ideaAttributes.productType.includes('ebook')) {
      adjustedScore *= (1 + adjustmentFactor);
    }
    if (pref.preferenceKey.includes('calculator') && ideaAttributes.productType.includes('calculator')) {
      adjustedScore *= (1 + adjustmentFactor);
    }
    if (pref.preferenceKey.includes('recurring') && (ideaAttributes.productType.includes('saas') || ideaAttributes.productType.includes('membership'))) {
      adjustedScore *= (1 + adjustmentFactor);
    }
    if (pref.preferenceKey.includes('compliance') && ideaAttributes.subNiche.includes('safety')) {
      adjustedScore *= (1 + adjustmentFactor);
    }
  }

  return Math.round(Math.max(0, Math.min(100, adjustedScore)) * 100) / 100;
}

/**
 * Re-score all pending ideas for a user
 */
export async function rescoreAllPendingIdeas(userId: string): Promise<number> {
  const [rules, preferences, ideas] = await Promise.all([
    prisma.goldenRule.findMany({ where: { userId, isActive: true } }),
    prisma.userPreferenceLearned.findMany({ where: { userId } }),
    prisma.idea.findMany({ where: { status: 'pending' } }),
  ]);

  let updated = 0;

  for (const idea of ideas) {
    const subScores: SubScores = {
      trend: idea.trendScore,
      demand: idea.demandScore,
      competition: idea.competitionScore,
      feasibility: idea.feasibilityScore,
      revenue: idea.revenuePotentialScore,
    };

    let composite = calculateCompositeScore(subScores);
    composite = applyGoldenRules(composite, {
      productType: idea.productType,
      complianceFlag: idea.complianceFlag,
      subNiche: idea.subNiche,
      title: idea.title,
      summary: idea.summary,
    }, rules);
    composite = applyLearnedPreferences(composite, {
      productType: idea.productType,
      subNiche: idea.subNiche,
    }, preferences);

    if (composite !== idea.compositeScore) {
      await prisma.idea.update({
        where: { id: idea.id },
        data: {
          compositeScore: composite,
          // Auto-archive if score drops below threshold
          status: composite < 15 ? 'archived' : idea.status,
        },
      });
      updated++;
    }
  }

  return updated;
}

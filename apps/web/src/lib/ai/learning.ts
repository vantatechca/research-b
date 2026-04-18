// Learning Loop - Processes feedback to update user preferences and detect patterns

import prisma from '@/lib/db';
import { rescoreAllPendingIdeas } from './scoring';

interface FeedbackFeatures {
  productTypes: string[];
  subNiches: string[];
  complianceFlag: string;
  scoreRange: 'high' | 'medium' | 'low';
  hasRecurringRevenue: boolean;
}

/**
 * Extract features from an idea for learning purposes
 */
function extractIdeaFeatures(idea: {
  productType: string[];
  subNiche: string[];
  complianceFlag: string;
  compositeScore: number;
}): FeedbackFeatures {
  return {
    productTypes: idea.productType,
    subNiches: idea.subNiche,
    complianceFlag: idea.complianceFlag,
    scoreRange: idea.compositeScore >= 70 ? 'high' : idea.compositeScore >= 40 ? 'medium' : 'low',
    hasRecurringRevenue: idea.productType.some(t => ['saas', 'membership', 'community'].includes(t)),
  };
}

/**
 * Process a single feedback event and update learned preferences
 */
export async function processFeedback(
  userId: string,
  ideaId: string,
  action: string,
  note?: string
): Promise<void> {
  // Get the idea details
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) return;

  const features = extractIdeaFeatures(idea);
  const isPositive = action === 'approve' || action === 'star';
  const isNegative = action === 'decline';

  if (!isPositive && !isNegative) return; // Only learn from approve/decline/star

  // Update product type preferences
  for (const pt of features.productTypes) {
    await updatePreference(userId, `product_type_${pt}`, isPositive, ideaId);
  }

  // Update niche preferences
  for (const niche of features.subNiches) {
    await updatePreference(userId, `niche_${niche}`, isPositive, ideaId);
  }

  // Update compliance preference
  await updatePreference(userId, `compliance_${features.complianceFlag}`, isPositive, ideaId);

  // Update recurring revenue preference
  if (features.hasRecurringRevenue) {
    await updatePreference(userId, 'recurring_revenue', isPositive, ideaId);
  }

  // Check for pattern detection (after enough data)
  await detectPatterns(userId);

  // Re-score pending ideas with updated preferences
  await rescoreAllPendingIdeas(userId);
}

/**
 * Update or create a learned preference
 */
async function updatePreference(
  userId: string,
  key: string,
  isPositive: boolean,
  feedbackSourceId: string
): Promise<void> {
  const existing = await prisma.userPreferenceLearned.findFirst({
    where: { userId, preferenceKey: key },
  });

  if (existing) {
    const currentValue = existing.preferenceValue as Record<string, number | string>;
    const approvals = (Number(currentValue.approvals) || 0) + (isPositive ? 1 : 0);
    const rejections = (Number(currentValue.rejections) || 0) + (isPositive ? 0 : 1);
    const total = approvals + rejections;
    const approvalRate = total > 0 ? approvals / total : 0.5;

    // Confidence increases with more data, with diminishing returns
    const confidence = Math.min(0.99, 1 - (1 / (total + 1)));

    await prisma.userPreferenceLearned.update({
      where: { id: existing.id },
      data: {
        preferenceValue: {
          direction: approvalRate > 0.5 ? 'positive' : 'negative',
          approvals,
          rejections,
          approvalRate: Math.round(approvalRate * 100) / 100,
        },
        confidence: Math.round(confidence * 100) / 100,
        derivedFrom: [...existing.derivedFrom, feedbackSourceId],
      },
    });
  } else {
    await prisma.userPreferenceLearned.create({
      data: {
        userId,
        preferenceKey: key,
        preferenceValue: {
          direction: isPositive ? 'positive' : 'negative',
          approvals: isPositive ? 1 : 0,
          rejections: isPositive ? 0 : 1,
          approvalRate: isPositive ? 1.0 : 0.0,
        },
        confidence: 0.3, // Low initial confidence
        derivedFrom: [feedbackSourceId],
      },
    });
  }
}

/**
 * Detect patterns in feedback and suggest golden rules
 */
async function detectPatterns(userId: string): Promise<void> {
  const preferences = await prisma.userPreferenceLearned.findMany({
    where: { userId, confidence: { gte: 0.7 } },
  });

  // Only run pattern detection when we have enough data
  const totalFeedback = await prisma.ideaFeedback.count({
    where: { userId, action: { in: ['approve', 'decline'] } },
  });

  if (totalFeedback < 5) return; // Need at least 5 feedback events

  // Check for strong patterns (>80% in one direction with 5+ data points)
  for (const pref of preferences) {
    const value = pref.preferenceValue as Record<string, number | string>;
    const approvalRate = Number(value.approvalRate) || 0.5;
    const total = (Number(value.approvals) || 0) + (Number(value.rejections) || 0);

    if (total >= 5 && (approvalRate > 0.8 || approvalRate < 0.2)) {
      // Check if a golden rule already exists for this pattern
      const existingRule = await prisma.goldenRule.findFirst({
        where: {
          userId,
          ruleText: { contains: pref.preferenceKey.replace(/_/g, ' ') },
          createdFrom: 'inferred',
        },
      });

      if (!existingRule) {
        // We don't auto-create rules — instead we update the preference confidence
        // The rule suggestion endpoint will use these for suggestions
        await prisma.userPreferenceLearned.update({
          where: { id: pref.id },
          data: { confidence: Math.min(0.99, pref.confidence + 0.05) },
        });
      }
    }
  }
}

/**
 * Generate rule suggestions based on learned preferences
 */
export async function generateRuleSuggestions(userId: string): Promise<Array<{
  ruleType: string;
  ruleText: string;
  confidence: number;
  reasoning: string;
}>> {
  const preferences = await prisma.userPreferenceLearned.findMany({
    where: { userId, confidence: { gte: 0.6 } },
    orderBy: { confidence: 'desc' },
    take: 10,
  });

  const existingRules = await prisma.goldenRule.findMany({
    where: { userId },
  });

  const suggestions: Array<{ ruleType: string; ruleText: string; confidence: number; reasoning: string }> = [];

  for (const pref of preferences) {
    const value = pref.preferenceValue as Record<string, number | string>;
    const approvalRate = Number(value.approvalRate) || 0.5;
    const total = (Number(value.approvals) || 0) + (Number(value.rejections) || 0);

    if (total < 3) continue;

    const friendlyKey = pref.preferenceKey.replace(/_/g, ' ').replace('product type ', '').replace('niche ', '');

    // Check if similar rule already exists
    const hasExisting = existingRules.some(r =>
      r.ruleText.toLowerCase().includes(friendlyKey.toLowerCase())
    );
    if (hasExisting) continue;

    if (approvalRate > 0.75) {
      suggestions.push({
        ruleType: 'prefer',
        ruleText: `Prioritize ideas related to ${friendlyKey} — you've approved ${Math.round(approvalRate * 100)}% of similar ideas`,
        confidence: pref.confidence,
        reasoning: `Based on ${total} feedback events: ${value.approvals} approvals, ${value.rejections} rejections`,
      });
    } else if (approvalRate < 0.25) {
      suggestions.push({
        ruleType: 'deprioritize',
        ruleText: `Deprioritize ideas related to ${friendlyKey} — you've declined ${Math.round((1 - approvalRate) * 100)}% of similar ideas`,
        confidence: pref.confidence,
        reasoning: `Based on ${total} feedback events: ${value.approvals} approvals, ${value.rejections} rejections`,
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

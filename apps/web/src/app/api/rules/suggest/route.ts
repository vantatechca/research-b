import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Analyze the user's feedback patterns to generate mock suggestions
    const feedbackCounts = await prisma.ideaFeedback.groupBy({
      by: ['action'],
      where: { userId: user.id },
      _count: { action: true },
    });

    const approvedIdeas = await prisma.ideaFeedback.findMany({
      where: { userId: user.id, action: 'approve' },
      include: {
        idea: {
          select: {
            peptideCategory: true,
            productType: true,
            complianceFlag: true,
            compositeScore: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    const declinedIdeas = await prisma.ideaFeedback.findMany({
      where: { userId: user.id, action: 'decline' },
      include: {
        idea: {
          select: {
            peptideCategory: true,
            productType: true,
            complianceFlag: true,
            compositeScore: true,
          },
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    // Build mock AI suggestions based on patterns
    const suggestions: Array<{
      ruleType: string;
      ruleText: string;
      confidence: number;
      reasoning: string;
    }> = [];

    // Analyze approved categories
    const approvedCategories = new Map<string, number>();
    for (const fb of approvedIdeas) {
      for (const cat of fb.idea.peptideCategory) {
        approvedCategories.set(cat, (approvedCategories.get(cat) || 0) + 1);
      }
    }

    // Suggest rules for frequently approved categories
    for (const [category, count] of approvedCategories.entries()) {
      if (count >= 2) {
        suggestions.push({
          ruleType: 'preference',
          ruleText: `Prefer ideas in the "${category}" peptide category`,
          confidence: Math.min(0.95, 0.5 + count * 0.1),
          reasoning: `You approved ${count} ideas in the "${category}" category recently.`,
        });
      }
    }

    // Analyze declined patterns
    const declinedWithRedCompliance = declinedIdeas.filter(
      (fb) => fb.idea.complianceFlag === 'red'
    ).length;
    if (declinedWithRedCompliance >= 2) {
      suggestions.push({
        ruleType: 'exclusion',
        ruleText: 'Exclude ideas with red compliance flags',
        confidence: Math.min(0.95, 0.5 + declinedWithRedCompliance * 0.1),
        reasoning: `You declined ${declinedWithRedCompliance} ideas with red compliance flags.`,
      });
    }

    // Check if user prefers high-scoring ideas
    const avgApprovedScore =
      approvedIdeas.length > 0
        ? approvedIdeas.reduce((sum, fb) => sum + fb.idea.compositeScore, 0) /
          approvedIdeas.length
        : 0;
    if (avgApprovedScore > 60 && approvedIdeas.length >= 3) {
      suggestions.push({
        ruleType: 'threshold',
        ruleText: `Only show ideas with composite score above ${Math.round(avgApprovedScore - 10)}`,
        confidence: 0.7,
        reasoning: `Your approved ideas average a composite score of ${Math.round(avgApprovedScore)}.`,
      });
    }

    // Always include some generic suggestions if not enough data
    if (suggestions.length < 2) {
      suggestions.push({
        ruleType: 'preference',
        ruleText: 'Prioritize ideas with strong trend momentum (trend score > 70)',
        confidence: 0.5,
        reasoning: 'General best practice for identifying high-potential products.',
      });
    }
    if (suggestions.length < 3) {
      suggestions.push({
        ruleType: 'exclusion',
        ruleText: 'Skip ideas with fewer than 3 supporting signals',
        confidence: 0.45,
        reasoning: 'Ideas with more signals tend to have stronger evidence bases.',
      });
    }

    return NextResponse.json({
      suggestions,
      feedbackAnalysis: {
        totalFeedback: feedbackCounts.reduce(
          (sum, fc) => sum + fc._count.action,
          0
        ),
        breakdown: feedbackCounts.map((fc) => ({
          action: fc.action,
          count: fc._count.action,
        })),
      },
    });
  } catch (error) {
    console.error('Suggest rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

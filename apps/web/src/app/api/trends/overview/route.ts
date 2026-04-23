import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30')));
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Aggregate trend data
    const [
      totalIdeas,
      pendingIdeas,
      approvedIdeas,
      recentTrends,
      topIdeasByScore,
      ideaStatusCounts,
      recentSignalsCount,
    ] = await Promise.all([
      prisma.idea.count(),
      prisma.idea.count({ where: { status: 'pending' } }),
      prisma.idea.count({ where: { status: 'approved' } }),
      prisma.ideaTrend.findMany({
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: 'desc' },
        take: 200,
        include: {
          idea: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
      prisma.idea.findMany({
        orderBy: { compositeScore: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          compositeScore: true,
          trendScore: true,
          demandScore: true,
          status: true,
          peptideCategory: true,
          discoveredAt: true,
        },
      }),
      prisma.idea.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.ideaSignal.count({
        where: { scrapedAt: { gte: since } },
      }),
    ]);

    // Aggregate trends by metric type
    const trendsByMetric: Record<string, Array<{ date: string; value: number; count: number }>> = {};
    for (const trend of recentTrends) {
      if (!trendsByMetric[trend.metricType]) {
        trendsByMetric[trend.metricType] = [];
      }
      const dateKey = trend.recordedAt.toISOString().split('T')[0];
      const existing = trendsByMetric[trend.metricType].find(
        (t) => t.date === dateKey
      );
      if (existing) {
        existing.value += trend.metricValue;
        existing.count += 1;
      } else {
        trendsByMetric[trend.metricType].push({
          date: dateKey,
          value: trend.metricValue,
          count: 1,
        });
      }
    }

    // Average out aggregated values
    for (const metric of Object.keys(trendsByMetric)) {
      trendsByMetric[metric] = trendsByMetric[metric]
        .map((t) => ({
          date: t.date,
          value: t.value / t.count,
          count: t.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return NextResponse.json({
      summary: {
        totalIdeas,
        pendingIdeas,
        approvedIdeas,
        recentSignals: recentSignalsCount,
        periodDays: days,
      },
      statusBreakdown: ideaStatusCounts.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      topIdeas: topIdeasByScore,
      topNiche: topIdeasByScore[0]?.peptideCategory?.[0] ?? "N/A",
      trendsByMetric,
    });
  } catch (error) {
    console.error('Trends overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

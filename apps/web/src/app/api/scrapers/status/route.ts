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
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Get recent scraper runs
    const runs = await prisma.scraperRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    // Get the latest run per scraper
    const latestByScraperMap = new Map<string, typeof runs[0]>();
    for (const run of runs) {
      if (!latestByScraperMap.has(run.scraperName)) {
        latestByScraperMap.set(run.scraperName, run);
      }
    }
    const latestByScraper = Array.from(latestByScraperMap.values());

    // Summary stats
    const runningCount = runs.filter((r) => r.status === 'running').length;
    const totalSignalsFound = runs.reduce((sum, r) => sum + r.signalsFound, 0);
    const totalIdeasGenerated = runs.reduce(
      (sum, r) => sum + r.ideasGenerated,
      0
    );
    const failedCount = runs.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      runs,
      latestByScraper,
      summary: {
        totalRuns: runs.length,
        running: runningCount,
        failed: failedCount,
        totalSignalsFound,
        totalIdeasGenerated,
      },
    });
  } catch (error) {
    console.error('Scraper status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

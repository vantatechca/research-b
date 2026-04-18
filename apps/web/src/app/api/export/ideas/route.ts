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
    const status = searchParams.get('status');
    const minScore = searchParams.get('minScore');

    const where: {
      status?: string;
      compositeScore?: { gte: number };
    } = {};

    if (status) {
      where.status = status;
    }
    if (minScore) {
      where.compositeScore = { gte: parseFloat(minScore) };
    }

    const ideas = await prisma.idea.findMany({
      where,
      orderBy: { compositeScore: 'desc' },
      include: {
        signals: {
          select: {
            id: true,
            signalType: true,
            sourceUrl: true,
            title: true,
            relevanceScore: true,
            scrapedAt: true,
          },
        },
        trends: {
          select: {
            id: true,
            metricType: true,
            metricValue: true,
            recordedAt: true,
          },
          orderBy: { recordedAt: 'desc' },
          take: 30,
        },
        feedback: {
          select: {
            id: true,
            action: true,
            note: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            signals: true,
            feedback: true,
            trends: true,
          },
        },
      },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, email: user.email },
      filters: {
        status: status || 'all',
        minScore: minScore ? parseFloat(minScore) : null,
      },
      totalIdeas: ideas.length,
      ideas,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="peptideiq-ideas-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export ideas error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

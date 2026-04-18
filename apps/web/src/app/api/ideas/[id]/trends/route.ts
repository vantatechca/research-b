import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get('metricType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: {
      ideaId: string;
      metricType?: string;
      recordedAt?: { gte?: Date; lte?: Date };
    } = { ideaId: id };

    if (metricType) {
      where.metricType = metricType;
    }
    if (dateFrom || dateTo) {
      where.recordedAt = {};
      if (dateFrom) where.recordedAt.gte = new Date(dateFrom);
      if (dateTo) where.recordedAt.lte = new Date(dateTo);
    }

    const trends = await prisma.ideaTrend.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
    });

    return NextResponse.json({ trends });
  } catch (error) {
    console.error('List trends error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

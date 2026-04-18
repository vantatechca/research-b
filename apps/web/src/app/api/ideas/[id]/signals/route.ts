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
    const signalType = searchParams.get('signalType');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const where: { ideaId: string; signalType?: string } = { ideaId: id };
    if (signalType) {
      where.signalType = signalType;
    }

    const signals = await prisma.ideaSignal.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ signals });
  } catch (error) {
    console.error('List signals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

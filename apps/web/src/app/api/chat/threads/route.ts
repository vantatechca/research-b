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
    const threadType = searchParams.get('type');
    const ideaId = searchParams.get('ideaId');

    const where: {
      userId: string;
      threadType?: string;
      ideaId?: string | null;
    } = { userId: user.id };

    if (threadType) {
      where.threadType = threadType;
    }
    if (ideaId) {
      where.ideaId = ideaId;
    }

    const threads = await prisma.chatThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        idea: {
          select: { id: true, title: true, slug: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('List threads error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { threadType, title, ideaId } = body;

    if (!threadType) {
      return NextResponse.json(
        { error: 'threadType is required' },
        { status: 400 }
      );
    }

    const validTypes = ['global', 'idea_specific', 'idea'];
    if (!validTypes.includes(threadType)) {
      return NextResponse.json(
        { error: `threadType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Normalize 'idea' -> 'idea_specific'
    const normalizedType = threadType === 'idea' ? 'idea_specific' : threadType;

    if (normalizedType === 'idea_specific' && !ideaId) {
      return NextResponse.json(
        { error: 'ideaId is required for idea_specific threads' },
        { status: 400 }
      );
    }

    // Verify idea exists if provided
    if (ideaId) {
      const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
      if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
      }
    }

    const thread = await prisma.chatThread.create({
      data: {
        userId: user.id,
        threadType: normalizedType,
        title: title || null,
        ideaId: ideaId || null,
      },
      include: {
        idea: {
          select: { id: true, title: true, slug: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error('Create thread error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

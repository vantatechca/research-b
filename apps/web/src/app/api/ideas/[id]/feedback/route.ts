import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, note } = body;

    const validActions = ['approve', 'decline', 'star', 'archive', 'note'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Action must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Map feedback action to idea status update
    const statusMap: Record<string, string> = {
      approve: 'approved',
      decline: 'declined',
      star: 'starred',
      archive: 'archived',
    };

    // Create feedback and optionally update idea status in a transaction
    const [feedback] = await prisma.$transaction([
      prisma.ideaFeedback.create({
        data: {
          ideaId: id,
          userId: user.id,
          action,
          note: note || null,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      ...(statusMap[action]
        ? [
            prisma.idea.update({
              where: { id },
              data: { status: statusMap[action] },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Create feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const feedback = await prisma.ideaFeedback.findMany({
      where: { ideaId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('List feedback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

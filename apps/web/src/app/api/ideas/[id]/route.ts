import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// UUID v4 format validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // Look up by UUID if it's a UUID, otherwise by slug
    const idea = await prisma.idea.findUnique({
      where: UUID_REGEX.test(id) ? { id } : { slug: id },

      include: {
        signals: {
          orderBy: { scrapedAt: 'desc' },
          take: 50,
        },
        trends: {
          orderBy: { recordedAt: 'desc' },
          take: 100,
        },
        feedback: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
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

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Get idea error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const where = UUID_REGEX.test(id) ? { id } : { slug: id };

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'status',
      'summary',
      'detailedAnalysis',
      'complianceFlag',
      'complianceNotes',
      'competitorGaps',
      'targetAudience',
      'peptideCategory',
      'productType',
      'subNiche',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const existing = await prisma.idea.findUnique({ where });
    if (!existing) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const idea = await prisma.idea.update({
      where,
      data: updateData,
      include: {
        _count: {
          select: {
            signals: true,
            feedback: true,
          },
        },
      },
    });

    return NextResponse.json({ idea });
  } catch (error) {
    console.error('Update idea error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
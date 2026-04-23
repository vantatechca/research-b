import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.goldenRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Accept both old and new field names
    const updateData: Record<string, unknown> = {};

    const ruleText = body.ruleText ?? body.text;
    if (ruleText !== undefined) updateData.ruleText = ruleText;

    const isActive = body.isActive ?? body.active;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (body.weight !== undefined) {
      // Frontend may send 0-100 int; DB stores 0-2 float
      const w = Number(body.weight);
      updateData.weight = w > 2 ? w / 50 : w;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const dbRule = await prisma.goldenRule.update({
      where: { id },
      data: updateData,
    });

    // Return in frontend format
    const rule = {
      id: dbRule.id,
      type: dbRule.ruleType,
      text: dbRule.ruleText,
      weight: Math.round((dbRule.weight ?? 1) * 50),
      active: dbRule.isActive,
      createdFrom: dbRule.createdFrom,
      createdAt: dbRule.createdAt,
    };

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Update rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.goldenRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.goldenRule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

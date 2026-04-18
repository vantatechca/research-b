import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rules = await prisma.goldenRule.findMany({
      where: { userId: user.id },
      orderBy: [{ ruleType: 'asc' }, { createdAt: 'desc' }],
    });

    // Group by ruleType
    const grouped: Record<string, typeof rules> = {};
    for (const rule of rules) {
      if (!grouped[rule.ruleType]) {
        grouped[rule.ruleType] = [];
      }
      grouped[rule.ruleType].push(rule);
    }

    return NextResponse.json({ rules, grouped });
  } catch (error) {
    console.error('List rules error:', error);
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
    const { ruleType, ruleText, weight, createdFrom } = body;

    if (!ruleType || !ruleText) {
      return NextResponse.json(
        { error: 'ruleType and ruleText are required' },
        { status: 400 }
      );
    }

    const rule = await prisma.goldenRule.create({
      data: {
        userId: user.id,
        ruleType,
        ruleText,
        weight: weight ?? 1.0,
        createdFrom: createdFrom || 'manual',
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Create rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

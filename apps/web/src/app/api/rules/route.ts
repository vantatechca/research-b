import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const dbRules = await prisma.goldenRule.findMany({
      where: { userId: user.id },
      orderBy: [{ ruleType: 'asc' }, { createdAt: 'desc' }],
    });

    // Normalize field names to match frontend
    const rules = dbRules.map((r) => ({
      id: r.id,
      type: r.ruleType,
      text: r.ruleText,
      weight: Math.round((r.weight ?? 1) * 50), // scale 0-2 float to 0-100 int
      active: r.isActive,
      createdFrom: r.createdFrom,
      createdAt: r.createdAt,
    }));

    // Group by type
    const grouped: Record<string, typeof rules> = {};
    for (const rule of rules) {
      if (!grouped[rule.type]) {
        grouped[rule.type] = [];
      }
      grouped[rule.type].push(rule);
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
    // Accept both old (ruleType/ruleText) and new (type/text) field names
    const ruleType = body.ruleType ?? body.type;
    const ruleText = body.ruleText ?? body.text;
    const rawWeight = body.weight;
    const createdFrom = body.createdFrom;

    if (!ruleType || !ruleText) {
      return NextResponse.json(
        { error: 'type and text are required' },
        { status: 400 }
      );
    }

    // Frontend sends weight 1-100 integer, DB stores as 0-2 float
    const weight =
      typeof rawWeight === 'number'
        ? rawWeight > 2
          ? rawWeight / 50
          : rawWeight
        : 1.0;

    const dbRule = await prisma.goldenRule.create({
      data: {
        userId: user.id,
        ruleType,
        ruleText,
        weight,
        createdFrom: createdFrom || 'manual',
      },
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

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Create rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status');
    const productType = searchParams.get('productType');
    const peptideCategory = searchParams.get('peptideCategory');
    const compliance = searchParams.get('compliance');
    const sourcePlatform = searchParams.get('sourcePlatform');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // Sort
    const sortBy = searchParams.get('sortBy') || 'compositeScore';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    const where: Prisma.IdeaWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (productType) {
      where.productType = { has: productType };
    }
    if (peptideCategory) {
      where.peptideCategory = { has: peptideCategory };
    }
    if (compliance) {
      where.complianceFlag = compliance;
    }
    if (sourcePlatform) {
      where.sourcePlatforms = { has: sourcePlatform };
    }
    if (minScore || maxScore) {
      where.compositeScore = {};
      if (minScore) where.compositeScore.gte = parseFloat(minScore);
      if (maxScore) where.compositeScore.lte = parseFloat(maxScore);
    }
    if (dateFrom || dateTo) {
      where.discoveredAt = {};
      if (dateFrom) where.discoveredAt.gte = new Date(dateFrom);
      if (dateTo) where.discoveredAt.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Allowed sort fields
    const allowedSortFields: Record<string, string> = {
      compositeScore: 'compositeScore',
      trendScore: 'trendScore',
      demandScore: 'demandScore',
      competitionScore: 'competitionScore',
      discoveredAt: 'discoveredAt',
      title: 'title',
    };
    const orderField = allowedSortFields[sortBy] || 'compositeScore';

    // Compute day boundary (midnight today, UTC)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [ideas, total, newToday, approvedCount, totalForRate] = await Promise.all([
      prisma.idea.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              signals: true,
              feedback: true,
            },
          },
        },
      }),
      prisma.idea.count({ where }),
      prisma.idea.count({
        where: { discoveredAt: { gte: startOfToday } },
      }),
      prisma.idea.count({ where: { status: 'approved' } }),
      prisma.idea.count(),
    ]);

    const approvalRate = totalForRate > 0
      ? Math.round((approvedCount / totalForRate) * 100)
      : 0;

    return NextResponse.json({
      ideas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      newToday,
      approvalRate,
    });
  } catch (error) {
    console.error('List ideas error:', error);
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
    const { title, summary, detailedAnalysis, peptideCategory, productType, subNiche, targetAudience, sourceUrls, sourcePlatforms, complianceFlag, complianceNotes, existingProducts, competitorGaps, compositeScore, trendScore, demandScore, competitionScore, feasibilityScore, revenuePotentialScore, discoverySource, aiModelUsed } = body;

    if (!title || !summary) {
      return NextResponse.json(
        { error: 'Title and summary are required' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(title);
    const existing = await prisma.idea.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        slug,
        summary,
        detailedAnalysis: detailedAnalysis || null,
        peptideCategory: peptideCategory || [],
        productType: productType || [],
        subNiche: subNiche || [],
        targetAudience: targetAudience || null,
        sourceUrls: sourceUrls || [],
        sourcePlatforms: sourcePlatforms || [],
        complianceFlag: complianceFlag || 'green',
        complianceNotes: complianceNotes || null,
        existingProducts: existingProducts || [],
        competitorGaps: competitorGaps || null,
        compositeScore: compositeScore || 0,
        trendScore: trendScore || 0,
        demandScore: demandScore || 0,
        competitionScore: competitionScore || 0,
        feasibilityScore: feasibilityScore || 0,
        revenuePotentialScore: revenuePotentialScore || 0,
        discoverySource: discoverySource || null,
        aiModelUsed: aiModelUsed || null,
      },
      include: {
        _count: {
          select: {
            signals: true,
            feedback: true,
          },
        },
      },
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    console.error('Create idea error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

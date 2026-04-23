import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

interface CompetitorProduct {
  name?: string;
  brand?: string;
  url?: string;
  price?: number | string;
  platform?: string;
  estimated_sales?: number;
  estSales?: number;
  category?: string;
  rating?: number;
  description?: string;
  ingredients?: string[];
  launchDate?: string;
  [key: string]: unknown;
}

interface NormalizedCompetitor {
  id: string;
  name: string;
  creator: string;
  platform: string;
  price: string;
  estSales: number;
  category: string;
  rating: number;
  url?: string;
  description?: string;
  ingredients?: string[];
  launchDate?: string;
  relatedIdeas: Array<{ id: string; title: string; slug: string }>;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const peptideCategory = searchParams.get('peptideCategory');
    const search = searchParams.get('search');

    const where: {
      existingProducts?: object;
      peptideCategory?: { has: string };
    } = {};

    if (peptideCategory) {
      where.peptideCategory = { has: peptideCategory };
    }

    const ideas = await prisma.idea.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        existingProducts: true,
        competitorGaps: true,
        peptideCategory: true,
        productType: true,
        compositeScore: true,
        competitionScore: true,
      },
      orderBy: { compositeScore: 'desc' },
    });

    // Extract and deduplicate competitor products across all ideas
    const competitorMap = new Map<
      string,
      CompetitorProduct & { relatedIdeas: Array<{ id: string; title: string; slug: string }> }
    >();

    for (const idea of ideas) {
      const products = idea.existingProducts as CompetitorProduct[];
      if (!Array.isArray(products)) continue;

      for (const product of products) {
        const key = (product.name || product.brand || JSON.stringify(product)).toLowerCase();

        if (search && !key.includes(search.toLowerCase())) {
          continue;
        }

        if (competitorMap.has(key)) {
          const existing = competitorMap.get(key)!;
          existing.relatedIdeas.push({
            id: idea.id,
            title: idea.title,
            slug: idea.slug,
          });
        } else {
          competitorMap.set(key, {
            ...product,
            relatedIdeas: [
              { id: idea.id, title: idea.title, slug: idea.slug },
            ],
          });
        }
      }
    }

    // Normalize shape for frontend — handle snake_case / camelCase / missing fields
    const competitors: NormalizedCompetitor[] = Array.from(competitorMap.values()).map((c, idx) => {
      const priceValue = c.price;
      const priceStr =
        priceValue === undefined || priceValue === null
          ? '—'
          : typeof priceValue === 'number'
          ? priceValue === 0
            ? 'Free'
            : `$${priceValue.toFixed(2)}`
          : String(priceValue);

      return {
        id: `competitor-${idx}-${(c.name ?? c.brand ?? 'unknown').replace(/\s+/g, '-').toLowerCase()}`,
        name: c.name ?? c.brand ?? 'Unknown',
        creator: (c.creator as string) ?? (c.brand as string) ?? '—',
        platform: c.platform ?? 'unknown',
        price: priceStr,
        estSales: (c.estSales ?? c.estimated_sales ?? 0) as number,
        category:
          c.category ??
          (c.relatedIdeas[0] &&
            (ideas.find((i) => i.id === c.relatedIdeas[0].id)?.peptideCategory?.[0] ?? '')) ??
          '—',
        rating: (c.rating as number) ?? 0,
        url: c.url,
        description: c.description as string | undefined,
        ingredients: c.ingredients as string[] | undefined,
        launchDate: c.launchDate as string | undefined,
        relatedIdeas: c.relatedIdeas,
      };
    });

    return NextResponse.json({
      competitors,
      totalProducts: competitors.length,
      totalIdeasWithCompetitors: ideas.filter(
        (i) => Array.isArray(i.existingProducts) && (i.existingProducts as unknown[]).length > 0
      ).length,
    });
  } catch (error) {
    console.error('Competitors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

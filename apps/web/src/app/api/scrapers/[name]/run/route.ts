import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const WORKER_API_URL = process.env.WORKER_API_URL;

// Must match SCRAPERS in apps/workers/main.py
const VALID_SCRAPERS = new Set([
  'reddit',
  'google_trends',
  'youtube',
  'rss',
  'bhw',
  'etsy',
  'whop',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!VALID_SCRAPERS.has(name)) {
    return NextResponse.json(
      { error: `Unknown scraper: ${name}`, available: Array.from(VALID_SCRAPERS) },
      { status: 400 }
    );
  }

  if (!WORKER_API_URL) {
    return NextResponse.json(
      { error: 'WORKER_API_URL not configured' },
      { status: 503 }
    );
  }

  // Optimistic row so the activity feed lights up while it runs
  const run = await prisma.scraperRun.create({
    data: { scraperName: name, status: 'running' },
  });

  try {
    const res = await fetch(`${WORKER_API_URL}/run/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // 10 min ceiling — long scrapes shouldn't hang the request forever
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || body.error) {
      await prisma.scraperRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorLog: body.error ?? `Worker returned ${res.status}`,
        },
      });
      return NextResponse.json(
        { error: body.error ?? `Worker returned ${res.status}` },
        { status: 502 }
      );
    }

    await prisma.scraperRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        signalsFound: body.signals_found ?? 0,
        ideasGenerated: body.ideas_generated ?? 0,
      },
    });

    return NextResponse.json({ ok: true, runId: run.id, ...body });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    await prisma.scraperRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorLog: detail,
      },
    });
    return NextResponse.json(
      { error: 'Failed to reach worker', detail },
      { status: 502 }
    );
  }
}
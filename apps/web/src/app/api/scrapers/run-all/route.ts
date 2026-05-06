import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const WORKER_API_URL = process.env.WORKER_API_URL ?? 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const res = await fetch(`${WORKER_API_URL}/run-all`, {
      method: 'POST',
      // Workers run-all is long; don't let Node default-timeout it
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Worker rejected request', status: res.status, detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('run-all proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to reach worker', detail: String(error) },
      { status: 502 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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

    // Verify thread ownership
    const thread = await prisma.chatThread.findUnique({ where: { id } });
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    if (thread.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const before = searchParams.get('before');

    const where: { threadId: string; createdAt?: { lt: Date } } = {
      threadId: id,
    };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('List messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify thread ownership
    const thread = await prisma.chatThread.findUnique({
      where: { id },
      include: {
        idea: {
          select: { title: true, summary: true, peptideCategory: true },
        },
      },
    });
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    if (thread.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        threadId: id,
        role: 'user',
        content: content.trim(),
      },
    });

    // Generate mock AI response
    const aiResponseText = generateMockResponse(content.trim(), thread);

    const aiMessage = await prisma.chatMessage.create({
      data: {
        threadId: id,
        role: 'assistant',
        content: aiResponseText,
        metadata: { model: 'mock', generated: true },
      },
    });

    // Update thread lastMessageAt
    await prisma.chatThread.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json(
      {
        userMessage,
        aiMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateMockResponse(
  userContent: string,
  thread: {
    threadType: string;
    idea?: { title: string; summary: string; peptideCategory: string[] } | null;
  }
): string {
  const lower = userContent.toLowerCase();

  if (thread.threadType === 'idea_specific' && thread.idea) {
    if (lower.includes('competitor') || lower.includes('competition')) {
      return `Based on my analysis of "${thread.idea.title}", the competitive landscape shows moderate saturation. Key differentiators to consider include formulation innovation, bioavailability improvements, and targeting underserved demographics. I'd recommend conducting a deeper competitor gap analysis focusing on pricing tiers and claims.`;
    }
    if (lower.includes('trend') || lower.includes('demand')) {
      return `The trend data for "${thread.idea.title}" shows a consistent upward trajectory over the past 90 days. Search volume has increased approximately 35% month-over-month, and social media mentions are growing. This suggests strong near-term demand, though I'd recommend monitoring for seasonality effects.`;
    }
    if (lower.includes('compliance') || lower.includes('regulation')) {
      return `For "${thread.idea.title}" in the ${thread.idea.peptideCategory.join(', ')} category, key regulatory considerations include FDA supplement labeling requirements, DSHEA compliance, and any state-specific restrictions. I recommend reviewing current structure/function claims guidelines before finalizing product positioning.`;
    }
    return `Regarding "${thread.idea.title}": ${thread.idea.summary}\n\nThis is a mock response. When an AI API key is configured, I'll provide real-time analysis based on the latest market data, trend signals, and your golden rules. What specific aspect would you like to explore further?`;
  }

  if (lower.includes('help') || lower.includes('what can')) {
    return 'I can help you with:\n\n1. **Idea Analysis** - Deep dives into specific product ideas, competitive landscapes, and market trends\n2. **Rule Suggestions** - Recommendations for golden rules based on your feedback patterns\n3. **Trend Interpretation** - Explaining what trend data means for your product strategy\n4. **Compliance Guidance** - General regulatory considerations for peptide products\n\nAsk me about any specific idea or general peptide market topic!';
  }

  if (lower.includes('peptide') || lower.includes('bpc') || lower.includes('collagen')) {
    return 'The peptide supplement market continues to show strong growth. Key trending categories include collagen peptides, BPC-157 derivatives, and nootropic peptide blends. Consumer interest is particularly high in bioavailability-enhanced formulations and targeted delivery systems. Would you like me to analyze a specific peptide category in more detail?';
  }

  return 'This is a mock AI response. When a real AI API key is configured, I will provide intelligent analysis based on your peptide research data, market signals, and personal golden rules. For now, try asking about specific ideas, trends, competitors, or compliance topics to see example responses.';
}

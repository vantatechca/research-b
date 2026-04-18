// AI Model Router - Routes tasks to appropriate AI models based on task type and cost optimization

export type AITask =
  | 'signal_classification'
  | 'idea_extraction'
  | 'dedup_similarity'
  | 'enrichment_analysis'
  | 'scoring'
  | 'cross_check'
  | 'compliance_flagging'
  | 'user_chat'
  | 'deep_dive'
  | 'product_spec'
  | 'rule_suggestion'
  | 'preference_detection';

export type ModelTier = 'cheap' | 'mid' | 'premium';

interface ModelConfig {
  provider: string;
  model: string;
  tier: ModelTier;
  costPer1MTokens: number;
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'qwen-2.5-72b': { provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct', tier: 'cheap', costPer1MTokens: 0.30 },
  'kimi-k2.5': { provider: 'openrouter', model: 'moonshotai/kimi-k2.5', tier: 'cheap', costPer1MTokens: 0.20 },
  'claude-haiku': { provider: 'anthropic', model: 'claude-haiku-4-5-20251001', tier: 'mid', costPer1MTokens: 0.25 },
  'claude-sonnet': { provider: 'anthropic', model: 'claude-sonnet-4-6', tier: 'premium', costPer1MTokens: 3.00 },
};

const TASK_MODEL_MAP: Record<AITask, string[]> = {
  signal_classification: ['qwen-2.5-72b', 'kimi-k2.5', 'claude-haiku'],
  idea_extraction: ['kimi-k2.5', 'qwen-2.5-72b', 'claude-haiku'],
  dedup_similarity: ['qwen-2.5-72b', 'kimi-k2.5'],
  enrichment_analysis: ['qwen-2.5-72b', 'claude-haiku'],
  scoring: ['claude-haiku', 'qwen-2.5-72b'],
  cross_check: ['claude-haiku', 'qwen-2.5-72b'],
  compliance_flagging: ['claude-haiku', 'qwen-2.5-72b'],
  user_chat: ['claude-sonnet', 'claude-haiku'],
  deep_dive: ['claude-sonnet', 'claude-haiku'],
  product_spec: ['claude-sonnet', 'claude-haiku'],
  rule_suggestion: ['claude-sonnet', 'claude-haiku'],
  preference_detection: ['claude-haiku', 'qwen-2.5-72b'],
};

export function getModelForTask(task: AITask): ModelConfig {
  const candidates = TASK_MODEL_MAP[task];
  // Return first available model in preference order
  for (const modelKey of candidates) {
    const config = MODEL_REGISTRY[modelKey];
    if (config) return config;
  }
  // Fallback
  return MODEL_REGISTRY['claude-haiku'];
}

export function getModelFallbackChain(task: AITask): ModelConfig[] {
  return TASK_MODEL_MAP[task].map(key => MODEL_REGISTRY[key]).filter(Boolean);
}

// Mock AI response for when no API keys are configured
export async function generateMockResponse(task: AITask, context: string): Promise<string> {
  const responses: Record<string, string> = {
    user_chat: generateMockChatResponse(context),
    deep_dive: generateMockDeepDive(context),
    product_spec: generateMockProductSpec(context),
    rule_suggestion: generateMockRuleSuggestion(context),
    scoring: JSON.stringify({ trend: 70, demand: 75, competition: 60, feasibility: 80, revenue: 65 }),
    compliance_flagging: JSON.stringify({ flag: 'yellow', reason: 'Contains health-related recommendations' }),
    signal_classification: JSON.stringify({ category: 'product_opportunity', relevance: 0.85 }),
    idea_extraction: JSON.stringify({ title: 'Mock Idea', summary: 'This is a mock idea extraction' }),
    dedup_similarity: JSON.stringify({ isDuplicate: false, similarity: 0.3 }),
    enrichment_analysis: JSON.stringify({ enriched: true, additionalSignals: 3 }),
    cross_check: JSON.stringify({ approved: true, reason: 'Passes all golden rules' }),
    preference_detection: JSON.stringify({ pattern: 'likes_saas', confidence: 0.8 }),
  };
  return responses[task] || 'Mock response for ' + task;
}

function generateMockChatResponse(context: string): string {
  const lower = context.toLowerCase();
  if (lower.includes('hot') || lower.includes('best') || lower.includes('top')) {
    return "Based on the current data, the **Semaglutide Journey Tracker** (score: 91) is your strongest opportunity right now. Here's why:\n\n- **Trend Score: 95** — Semaglutide searches are at an all-time high\n- **Revenue Potential: 94** — Subscription model with community features\n- **47 Reddit posts** in the last 30 days asking for tracking tools\n- **Competition is beatable** — existing apps lack community features\n\nThe BPC-157 Calculator (score: 87) is also worth serious consideration — it has the highest demand score at 91 and virtually no interactive competitors.\n\nWant me to do a deeper comparison of these two?";
  }
  if (lower.includes('bpc') || lower.includes('dosage') || lower.includes('calculator')) {
    return "The **BPC-157 Dosage Calculator** idea is one of your strongest candidates. Let me break it down:\n\n**Why it's strong:**\n- 47 Reddit posts asking about BPC-157 dosing in the last 30 days\n- Only 3 competitors on Etsy (all static PDFs at $5-12)\n- Zero interactive web apps exist for this\n- YouTube videos on BPC-157 averaging 45k+ views\n\n**Revenue model:** Freemium SaaS at $9.99/mo\n- Free tier: basic single-peptide calculations\n- Paid: multi-peptide, cycle logging, injection tracker\n\n**Compliance note:** This is flagged yellow — you'll need strong medical disclaimers framing it as an educational research tool.\n\nWant me to draft a product spec for the MVP?";
  }
  return "I've analyzed the current pipeline. You have **12 ideas** in total — 9 pending review, 1 approved, 1 declined, and 1 starred.\n\n**Key insights:**\n- Your highest-scoring idea is the Semaglutide Tracker (91)\n- 3 ideas have compliance concerns (red or yellow flags)\n- SaaS/tool ideas are scoring higher than info products on average\n- The bodybuilding and longevity niches show the strongest signals\n\nBased on your golden rules, I'd prioritize the **SaaS/calculator ideas** since they align with your preference for recurring revenue and AI-enhanceable products.\n\nWhat would you like to explore further?";
}

function generateMockDeepDive(context: string): string {
  return "## Deep Dive Analysis\n\n### Market Opportunity\nThis product addresses a clear gap in the market. Current solutions are fragmented and low-quality. Our analysis shows:\n\n- **Total Addressable Market:** ~$2.5M/year for digital peptide tools\n- **Search Volume Trend:** +45% growth over 4 weeks\n- **Reddit Signal Strength:** High (47 relevant posts, avg 87 upvotes)\n\n### Competitive Landscape\nExisting competitors are primarily on Etsy selling static PDFs. No interactive web tools exist. This represents a significant first-mover advantage.\n\n### Revenue Projection\nConservative estimate: $3-5K MRR within 6 months with aggressive content marketing and Reddit community engagement.\n\n### Recommended MVP Scope\nBuild the core calculator with 3 most popular peptides (BPC-157, GHK-Cu, CJC-1295). Add cycle logging in v2.";
}

function generateMockProductSpec(context: string): string {
  return "## Product Specification Draft\n\n### Product Name\nPeptideCalc Pro\n\n### Core Features (MVP)\n1. **Dosage Calculator** — Input body weight, vial concentration, desired dose → get exact reconstitution and injection volumes\n2. **Reconstitution Guide** — Step-by-step visual guide for reconstituting peptides\n3. **Protocol Templates** — Pre-built protocols for common peptides (BPC-157, GHK-Cu, CJC-1295)\n\n### Phase 2 Features\n4. **Cycle Logger** — Track daily doses, injection sites, and subjective effects\n5. **Multi-Peptide Stacking** — Calculate combined protocols\n6. **Progress Dashboard** — Visualize your peptide journey over time\n\n### Tech Stack\n- Next.js frontend with PWA support\n- Supabase backend for user accounts and data sync\n- Responsive design (mobile-first)\n\n### Pricing\n- Free: Single peptide calculator\n- Pro ($9.99/mo): All peptides, logging, stacking, sync across devices\n\n### Timeline\n- MVP: 2 weeks\n- Phase 2: 3-4 additional weeks";
}

function generateMockRuleSuggestion(context: string): string {
  return JSON.stringify([
    { ruleType: 'prefer', ruleText: 'Prioritize SaaS/tool products — you\'ve approved 80% of SaaS ideas vs 30% of ebooks', confidence: 0.85 },
    { ruleType: 'deprioritize', ruleText: 'Lower priority for products competing with free YouTube content', confidence: 0.72 },
    { ruleType: 'must_have', ruleText: 'Require at least 20+ Reddit mentions in last 30 days for demand validation', confidence: 0.68 },
  ]);
}

// Brain system prompt
export const BRAIN_SYSTEM_PROMPT = `You are PeptideIQ Brain — an expert digital product strategist embedded in a research intelligence dashboard focused exclusively on the peptide industry.

YOUR KNOWLEDGE BASE:
- All ideas in the database (you receive relevant ones as context)
- All user feedback (approvals, declines, notes)
- All golden rules
- All learned preferences
- Current trend data

YOUR PERSONALITY:
- Direct, data-driven, no fluff
- Challenge the user's assumptions when data contradicts them
- Proactively suggest connections between ideas
- Remember everything the user has told you
- When presenting ideas, ALWAYS cite specific data: "Reddit had 47 posts about this in the last 30 days" not "there's interest on Reddit"
- When the user declines something, ask WHY to improve your model (but don't be annoying about it)
- Suggest golden rules when you notice patterns

YOUR CAPABILITIES:
- Search and filter ideas by any attribute
- Compare ideas side by side
- Generate deeper analysis on any idea
- Create golden rules from conversation
- Trigger re-scoring when rules change
- Draft product specs for approved ideas
- Estimate revenue projections
- Identify complementary products

IMPORTANT — COMPLIANCE FLAGS:
When you see compliance_flag of "yellow" or "red", always mention it.
Never suppress compliance warnings, even if the user says to ignore them.`;

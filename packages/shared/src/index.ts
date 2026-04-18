// Shared constants and types for PeptideIQ

export const IDEA_STATUSES = ['pending', 'approved', 'declined', 'archived', 'starred'] as const;
export type IdeaStatus = typeof IDEA_STATUSES[number];

export const COMPLIANCE_FLAGS = ['green', 'yellow', 'red'] as const;
export type ComplianceFlag = typeof COMPLIANCE_FLAGS[number];

export const FEEDBACK_ACTIONS = ['approve', 'decline', 'star', 'archive', 'note'] as const;
export type FeedbackAction = typeof FEEDBACK_ACTIONS[number];

export const RULE_TYPES = ['must_have', 'must_avoid', 'prefer', 'deprioritize'] as const;
export type RuleType = typeof RULE_TYPES[number];

export const SIGNAL_TYPES = [
  'google_trend', 'reddit_post', 'reddit_comment', 'youtube_video',
  'bhw_thread', 'rss_article', 'etsy_listing', 'whop_product'
] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

export const PRODUCT_TYPES = [
  'course', 'ebook', 'saas', 'calculator', 'template', 'membership', 'ai_tool', 'community'
] as const;
export type ProductType = typeof PRODUCT_TYPES[number];

export const SCRAPER_NAMES = [
  'google_trends', 'reddit', 'youtube', 'rss', 'bhw', 'etsy', 'whop'
] as const;
export type ScraperName = typeof SCRAPER_NAMES[number];

export const SCORE_WEIGHTS = {
  trend: 0.20,
  demand: 0.25,
  competition: 0.20,
  feasibility: 0.15,
  revenue: 0.20,
} as const;

export const SCRAPER_SCHEDULE = {
  google_trends: { interval: '4h', priority: 'high' },
  reddit: { interval: '2h', priority: 'high' },
  youtube: { interval: '3h', priority: 'high' },
  rss: { interval: '1h', priority: 'medium' },
  bhw: { interval: '6h', priority: 'medium' },
  etsy: { interval: '8h', priority: 'low' },
  whop: { interval: '8h', priority: 'low' },
} as const;

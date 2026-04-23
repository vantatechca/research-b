import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import type { Prisma } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL not set. Check your .env file.');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'founder@peptideiq.com' },
    update: {},
    create: {
      email: 'founder@peptideiq.com',
      password: hashSync('peptideiq2026', 10),
      name: 'PeptideIQ Founder',
      settings: {
        notifications: { email: true, push: true },
        scrapers: { reddit: true, google_trends: true, youtube: true, rss: true, bhw: true, etsy: true, whop: true },
      },
    },
  });

  // Seed ideas
  const ideas = [
    {
      title: 'BPC-157 Dosage & Reconstitution Calculator App',
      slug: 'bpc-157-dosage-calculator',
      summary: 'AI-powered calculator that helps users determine exact BPC-157 dosing based on body weight, goals, and vial concentration. Includes reconstitution guide, injection site rotation tracker, and cycle logging.',
      detailedAnalysis: 'High demand signal across Reddit and YouTube. Users consistently ask about dosing math for BPC-157, especially reconstitution ratios. Existing solutions are static PDFs or spreadsheets on Etsy ($5-12). No interactive web app exists. Subscription model ($9.99/mo) with free tier for basic calculations. Could expand to cover all peptides over time.',
      status: 'pending',
      compositeScore: 87,
      trendScore: 82,
      demandScore: 91,
      competitionScore: 74,
      feasibilityScore: 88,
      revenuePotentialScore: 79,
      peptideCategory: ['BPC-157'],
      productType: ['saas', 'calculator'],
      subNiche: ['longevity', 'bodybuilding', 'recovery'],
      targetAudience: 'Intermediate biohackers age 25-45 who use BPC-157 regularly',
      sourceUrls: ['https://reddit.com/r/Peptides/example1', 'https://youtube.com/watch?v=example1', 'https://trends.google.com/trends/explore?q=BPC-157+dosage'],
      sourcePlatforms: ['reddit', 'youtube', 'google_trends', 'etsy'],
      complianceFlag: 'yellow',
      complianceNotes: 'Contains dosing recommendations — frame as educational research tool with medical disclaimers',
      existingProducts: [
        { name: 'BPC-157 Dosage Chart PDF', url: 'https://etsy.com/listing/example1', price: 5.99, platform: 'etsy', estimated_sales: 234 },
        { name: 'Peptide Reconstitution Spreadsheet', url: 'https://etsy.com/listing/example2', price: 11.99, platform: 'etsy', estimated_sales: 89 },
        { name: 'Basic Peptide Calculator', url: 'https://etsy.com/listing/example3', price: 7.99, platform: 'etsy', estimated_sales: 156 },
      ],
      competitorGaps: 'All existing products are static (PDFs/spreadsheets). None offer interactive web-based calculations, cycle logging, or multi-peptide support. No SaaS subscription model exists in this space.',
      discoverySource: 'reddit',
      aiModelUsed: 'claude-haiku',
    },
    {
      title: 'Peptide Stacking Protocol Course',
      slug: 'peptide-stacking-course',
      summary: 'Comprehensive video course teaching peptide stacking strategies for different goals (fat loss, recovery, anti-aging, cognitive). Includes protocol templates, safety guidelines, and community access.',
      detailedAnalysis: 'Strong demand on Reddit with users frequently asking about combining peptides. YouTube creators covering this topic get 50k+ views. Competition exists in the form of free YouTube content, but no structured paid course exists specifically for peptide stacking.',
      status: 'pending',
      compositeScore: 72,
      trendScore: 68,
      demandScore: 78,
      competitionScore: 55,
      feasibilityScore: 70,
      revenuePotentialScore: 82,
      peptideCategory: ['BPC-157', 'CJC-1295', 'ipamorelin', 'GHK-Cu'],
      productType: ['course', 'community'],
      subNiche: ['bodybuilding', 'longevity', 'biohacking'],
      targetAudience: 'Advanced biohackers who already use individual peptides and want to optimize stacks',
      sourceUrls: ['https://reddit.com/r/Peptides/example2', 'https://youtube.com/watch?v=example2'],
      sourcePlatforms: ['reddit', 'youtube'],
      complianceFlag: 'yellow',
      complianceNotes: 'Course content about combining peptides could be seen as medical advice. Strong disclaimers needed.',
      existingProducts: [
        { name: 'Biohacking Masterclass', url: 'https://whop.com/example1', price: 197, platform: 'whop', estimated_sales: 450 },
      ],
      competitorGaps: 'Existing courses cover biohacking broadly. No peptide-stacking-specific course exists. Opportunity for deep, niche expertise.',
      discoverySource: 'youtube',
      aiModelUsed: 'claude-haiku',
    },
    {
      title: 'GHK-Cu Skincare Protocol & Tracking App',
      slug: 'ghk-cu-skincare-tracker',
      summary: 'Mobile-first web app for tracking GHK-Cu skincare protocols. Users log applications, take progress photos, and get AI-powered skin analysis over time. Includes protocol library and community before/after gallery.',
      detailedAnalysis: 'GHK-Cu is trending in the skincare and anti-aging space. r/SkincareAddiction and r/AntiAging show increasing interest. The crossover between peptides and skincare is underserved. Progress tracking with AI photo analysis is a unique angle.',
      status: 'pending',
      compositeScore: 65,
      trendScore: 72,
      demandScore: 60,
      competitionScore: 85,
      feasibilityScore: 45,
      revenuePotentialScore: 68,
      peptideCategory: ['GHK-Cu'],
      productType: ['saas', 'ai_tool'],
      subNiche: ['skincare', 'anti-aging'],
      targetAudience: 'Women 30-50 interested in anti-aging and willing to try peptide skincare',
      sourceUrls: ['https://reddit.com/r/SkincareAddiction/example3', 'https://reddit.com/r/AntiAging/example3'],
      sourcePlatforms: ['reddit', 'google_trends'],
      complianceFlag: 'green',
      complianceNotes: 'Skincare tracking is generally safe. Avoid making specific anti-aging claims.',
      existingProducts: [],
      competitorGaps: 'No dedicated GHK-Cu skincare tracking tool exists. Generic skincare apps do not include peptide-specific protocols.',
      discoverySource: 'reddit',
      aiModelUsed: 'qwen-2.5',
    },
    {
      title: 'Peptide Source Verification & Review Platform',
      slug: 'peptide-source-verification',
      summary: 'Community-driven platform where users rate and review peptide vendors with lab testing verification, purity scores, and shipping reliability ratings. Think "Yelp for peptide sources."',
      detailedAnalysis: 'Massive demand on Reddit — "where to buy peptides" is one of the most common questions. Trust and purity are top concerns. A verified review platform would be extremely valuable. Revenue through premium vendor listings and affiliate partnerships.',
      status: 'pending',
      compositeScore: 58,
      trendScore: 55,
      demandScore: 92,
      competitionScore: 40,
      feasibilityScore: 35,
      revenuePotentialScore: 75,
      peptideCategory: ['general'],
      productType: ['saas', 'community'],
      subNiche: ['general'],
      targetAudience: 'All peptide users looking for reliable sources',
      sourceUrls: ['https://reddit.com/r/Peptides/example4'],
      sourcePlatforms: ['reddit', 'bhw'],
      complianceFlag: 'red',
      complianceNotes: 'Facilitating peptide purchases raises significant regulatory concerns. Could be seen as promoting unregulated substances. Consult a lawyer before proceeding.',
      existingProducts: [
        { name: 'PeptideTest (basic review site)', url: 'https://example-peptide-review.com', price: 0, platform: 'web', estimated_sales: 0 },
      ],
      competitorGaps: 'Existing review sites lack lab verification integration and user trust scoring.',
      discoverySource: 'reddit',
      aiModelUsed: 'claude-haiku',
    },
    {
      title: 'Thymosin Alpha-1 Immune Protocol eBook',
      slug: 'thymosin-alpha-1-immune-ebook',
      summary: 'Comprehensive eBook covering Thymosin Alpha-1 for immune system optimization. Covers research, protocols, cycling strategies, and safety. Includes downloadable protocol templates.',
      detailedAnalysis: 'Post-COVID interest in immune-boosting peptides remains strong. Thymosin Alpha-1 is trending in longevity circles. Limited educational content exists beyond scattered YouTube videos.',
      status: 'approved',
      compositeScore: 61,
      trendScore: 58,
      demandScore: 65,
      competitionScore: 78,
      feasibilityScore: 90,
      revenuePotentialScore: 42,
      peptideCategory: ['thymosin-alpha-1'],
      productType: ['ebook'],
      subNiche: ['longevity', 'immune-health'],
      targetAudience: 'Health-conscious adults 35-60 interested in immune optimization',
      sourceUrls: ['https://reddit.com/r/Longevity/example5', 'https://pubmed.ncbi.nlm.nih.gov/example5'],
      sourcePlatforms: ['reddit', 'rss'],
      complianceFlag: 'yellow',
      complianceNotes: 'Immune health claims need careful framing. Position as educational review of published research.',
      existingProducts: [],
      competitorGaps: 'No comprehensive Thymosin Alpha-1 guide exists. Opportunity for first-mover advantage.',
      discoverySource: 'rss',
      aiModelUsed: 'qwen-2.5',
    },
    {
      title: 'Semaglutide Journey Tracker & Community',
      slug: 'semaglutide-journey-tracker',
      summary: 'Weight loss tracking app specifically for semaglutide/tirzepatide users. Track doses, weight, measurements, side effects, and connect with a community of users sharing their journeys.',
      detailedAnalysis: 'Semaglutide (Ozempic/Wegovy) is one of the hottest health trends. While not a traditional peptide product, the user overlap is massive. Tracking apps exist but none are peptide-specific with community features.',
      status: 'pending',
      compositeScore: 91,
      trendScore: 95,
      demandScore: 88,
      competitionScore: 62,
      feasibilityScore: 85,
      revenuePotentialScore: 94,
      peptideCategory: ['semaglutide', 'tirzepatide'],
      productType: ['saas', 'community'],
      subNiche: ['weight-loss', 'biohacking'],
      targetAudience: 'Adults 25-55 using semaglutide or tirzepatide for weight management',
      sourceUrls: ['https://reddit.com/r/Semaglutide/example6', 'https://trends.google.com/trends/explore?q=semaglutide', 'https://youtube.com/watch?v=example6'],
      sourcePlatforms: ['reddit', 'youtube', 'google_trends'],
      complianceFlag: 'yellow',
      complianceNotes: 'Semaglutide is a prescription medication. Must clearly state app is for tracking only, not medical advice.',
      existingProducts: [
        { name: 'GLP-1 Tracker App', url: 'https://apps.apple.com/example', price: 4.99, platform: 'app_store', estimated_sales: 2000 },
        { name: 'Semaglutide Weight Loss Journal', url: 'https://etsy.com/listing/example6', price: 8.99, platform: 'etsy', estimated_sales: 567 },
      ],
      competitorGaps: 'Existing trackers lack community features and peptide-specific dosing protocols. No web-based option with social features.',
      discoverySource: 'google_trends',
      aiModelUsed: 'claude-haiku',
    },
    {
      title: 'Peptide Compliance & Legal Guide for Sellers',
      slug: 'peptide-compliance-legal-guide',
      summary: 'Digital guide + template pack for entrepreneurs selling peptide-related digital products. Covers FDA regulations, disclaimer templates, advertising guidelines, and platform-specific rules.',
      detailedAnalysis: 'BHW threads show entrepreneurs worried about legal issues when selling health/peptide content. A compliance guide with ready-to-use templates would be immediately valuable. Low effort to create, high value for buyers.',
      status: 'pending',
      compositeScore: 69,
      trendScore: 45,
      demandScore: 72,
      competitionScore: 92,
      feasibilityScore: 95,
      revenuePotentialScore: 55,
      peptideCategory: ['general'],
      productType: ['ebook', 'template'],
      subNiche: ['business', 'compliance'],
      targetAudience: 'Digital entrepreneurs selling peptide-related products',
      sourceUrls: ['https://www.blackhatworld.com/example7'],
      sourcePlatforms: ['bhw'],
      complianceFlag: 'green',
      complianceNotes: 'Educational legal content is safe. Include disclaimer that this is not legal advice.',
      existingProducts: [],
      competitorGaps: 'No peptide-specific compliance guide exists for digital product sellers.',
      discoverySource: 'bhw',
      aiModelUsed: 'qwen-2.5',
    },
    {
      title: 'Epithalon Anti-Aging Protocol Membership',
      slug: 'epithalon-anti-aging-membership',
      summary: 'Monthly membership providing research-backed epithalon protocols, expert Q&A sessions, blood work interpretation guides, and a private community for serious anti-aging biohackers.',
      detailedAnalysis: 'Epithalon (epitalon) is gaining traction in longevity circles as a telomere-focused peptide. Reddit and YouTube show growing interest. A membership model creates recurring revenue with community lock-in.',
      status: 'pending',
      compositeScore: 74,
      trendScore: 70,
      demandScore: 66,
      competitionScore: 88,
      feasibilityScore: 72,
      revenuePotentialScore: 78,
      peptideCategory: ['epithalon'],
      productType: ['membership', 'community'],
      subNiche: ['longevity', 'anti-aging'],
      targetAudience: 'Affluent biohackers 40-65 focused on longevity',
      sourceUrls: ['https://reddit.com/r/Longevity/example8', 'https://youtube.com/watch?v=example8'],
      sourcePlatforms: ['reddit', 'youtube'],
      complianceFlag: 'yellow',
      complianceNotes: 'Anti-aging claims require careful sourcing. Frame all content around published research.',
      existingProducts: [
        { name: 'Longevity Protocol Club', url: 'https://whop.com/example2', price: 29, platform: 'whop', estimated_sales: 320 },
      ],
      competitorGaps: 'No epithalon-specific membership exists. General longevity memberships lack peptide depth.',
      discoverySource: 'youtube',
      aiModelUsed: 'claude-haiku',
    },
    {
      title: 'Peptide Interaction Checker Tool',
      slug: 'peptide-interaction-checker',
      summary: 'Web-based tool that checks for known interactions between peptides, supplements, and medications. Provides safety ratings and references to published research.',
      detailedAnalysis: 'Users on r/Peptides and r/Nootropics frequently ask about interactions between peptides and other substances. No dedicated tool exists. This could become the go-to reference and monetize through premium features.',
      status: 'starred',
      compositeScore: 83,
      trendScore: 60,
      demandScore: 85,
      competitionScore: 95,
      feasibilityScore: 65,
      revenuePotentialScore: 80,
      peptideCategory: ['general'],
      productType: ['saas', 'ai_tool'],
      subNiche: ['safety', 'research'],
      targetAudience: 'All peptide users, especially those combining multiple compounds',
      sourceUrls: ['https://reddit.com/r/Peptides/example9', 'https://reddit.com/r/Nootropics/example9'],
      sourcePlatforms: ['reddit'],
      complianceFlag: 'red',
      complianceNotes: 'Medical interaction checking has significant liability. Must be framed as informational, not medical advice. Strong disclaimers required.',
      existingProducts: [],
      competitorGaps: 'No peptide-specific interaction checker exists. Drug interaction checkers (like drugs.com) do not cover research peptides.',
      discoverySource: 'reddit',
      aiModelUsed: 'claude-sonnet',
    },
    {
      title: 'PT-141 & Sexual Wellness Peptide Guide',
      slug: 'pt-141-sexual-wellness-guide',
      summary: 'Discreet digital guide covering PT-141 (bremelanotide) protocols for sexual wellness. Includes dosing, timing, side effect management, and partner communication tips.',
      detailedAnalysis: 'PT-141 discussions on Reddit show high engagement but information is scattered. The taboo nature means fewer competitors are willing to create content here. High willingness to pay for discreet, private guides.',
      status: 'declined',
      compositeScore: 56,
      trendScore: 52,
      demandScore: 70,
      competitionScore: 80,
      feasibilityScore: 85,
      revenuePotentialScore: 45,
      peptideCategory: ['PT-141'],
      productType: ['ebook'],
      subNiche: ['sexual-wellness'],
      targetAudience: 'Adults 30-55 seeking peptide-based solutions for sexual wellness',
      sourceUrls: ['https://reddit.com/r/Peptides/example10'],
      sourcePlatforms: ['reddit'],
      complianceFlag: 'yellow',
      complianceNotes: 'Sexual wellness content requires age verification considerations and careful health claim framing.',
      existingProducts: [],
      competitorGaps: 'No comprehensive PT-141 guide exists as a digital product.',
      discoverySource: 'reddit',
      aiModelUsed: 'qwen-2.5',
    },
    {
      title: 'Peptide Beginner\'s Masterclass (Video Course)',
      slug: 'peptide-beginners-masterclass',
      summary: 'Complete video course for peptide beginners covering: what peptides are, how they work, reconstitution, injection technique, storage, popular peptides explained, and how to create a protocol.',
      detailedAnalysis: 'Highest volume of "peptide for beginners" searches across all platforms. YouTube videos on this topic consistently get 100k+ views. A structured course would capture the massive influx of newcomers to the peptide space.',
      status: 'pending',
      compositeScore: 79,
      trendScore: 85,
      demandScore: 90,
      competitionScore: 45,
      feasibilityScore: 75,
      revenuePotentialScore: 82,
      peptideCategory: ['general', 'BPC-157', 'GHK-Cu', 'CJC-1295'],
      productType: ['course'],
      subNiche: ['education', 'biohacking'],
      targetAudience: 'Complete beginners to peptides, all ages',
      sourceUrls: ['https://youtube.com/watch?v=example11', 'https://trends.google.com/trends/explore?q=peptides+for+beginners'],
      sourcePlatforms: ['youtube', 'google_trends', 'reddit'],
      complianceFlag: 'yellow',
      complianceNotes: 'Educational content is generally safe but injection technique content requires strong medical disclaimers.',
      existingProducts: [
        { name: 'Peptide 101 (YouTube creator course)', url: 'https://whop.com/example3', price: 97, platform: 'whop', estimated_sales: 280 },
      ],
      competitorGaps: 'One competitor course exists but has mixed reviews. Opportunity for higher production quality and more comprehensive content.',
      discoverySource: 'youtube',
      aiModelUsed: 'claude-haiku',
    },
    {
      title: 'AI Peptide Protocol Generator',
      slug: 'ai-peptide-protocol-generator',
      summary: 'AI chatbot that generates personalized peptide protocols based on user goals, health history, and experience level. Provides research-backed recommendations with source citations.',
      detailedAnalysis: 'Combines two mega-trends: AI and peptides. Users want personalized protocols but don\'t want to read through hundreds of Reddit threads. An AI tool that synthesizes community knowledge into actionable protocols would be groundbreaking.',
      status: 'pending',
      compositeScore: 85,
      trendScore: 88,
      demandScore: 82,
      competitionScore: 92,
      feasibilityScore: 60,
      revenuePotentialScore: 90,
      peptideCategory: ['general'],
      productType: ['ai_tool', 'saas'],
      subNiche: ['biohacking', 'personalization'],
      targetAudience: 'All peptide users, from beginners to advanced',
      sourceUrls: ['https://reddit.com/r/Peptides/example12', 'https://reddit.com/r/Biohackers/example12'],
      sourcePlatforms: ['reddit', 'youtube', 'google_trends'],
      complianceFlag: 'red',
      complianceNotes: 'AI-generated health protocols have significant regulatory risk. Must include prominent disclaimers and not replace medical advice.',
      existingProducts: [],
      competitorGaps: 'No AI-powered peptide protocol tool exists. This would be a first-mover in a rapidly growing space.',
      discoverySource: 'reddit',
      aiModelUsed: 'claude-sonnet',
    },
  ];

  for (const ideaData of ideas) {
    const idea = await prisma.idea.upsert({
      where: { slug: ideaData.slug },
      update: {},
      create: ideaData,
    });

    // Add signals for each idea
    const signalSets: Prisma.IdeaSignalCreateManyInput[] = [];

    if (ideaData.sourcePlatforms.includes('reddit')) {
      signalSets.push({
        ideaId: idea.id,
        signalType: 'reddit_post',
        sourceUrl: ideaData.sourceUrls[0] || 'https://reddit.com/r/Peptides/example',
        title: `Discussion: ${ideaData.title}`,
        rawContent: `Users asking about ${ideaData.peptideCategory.join(', ')} - high engagement thread`,
        metadata: { upvotes: Math.floor(Math.random() * 200) + 20, comment_count: Math.floor(Math.random() * 100) + 10, subreddit: 'r/Peptides' },
        relevanceScore: 0.85 + Math.random() * 0.15,
      });
    }

    if (ideaData.sourcePlatforms.includes('youtube')) {
      signalSets.push({
        ideaId: idea.id,
        signalType: 'youtube_video',
        sourceUrl: ideaData.sourceUrls.find(u => u.includes('youtube')) || 'https://youtube.com/watch?v=example',
        title: `${ideaData.peptideCategory[0] || 'Peptide'} Complete Guide`,
        rawContent: `Video covering ${ideaData.title} with high engagement`,
        metadata: { views: Math.floor(Math.random() * 200000) + 10000, likes: Math.floor(Math.random() * 5000) + 200, channel_subscribers: Math.floor(Math.random() * 100000) + 5000 },
        relevanceScore: 0.75 + Math.random() * 0.25,
      });
    }

    if (ideaData.sourcePlatforms.includes('google_trends')) {
      signalSets.push({
        ideaId: idea.id,
        signalType: 'google_trend',
        sourceUrl: ideaData.sourceUrls.find(u => u.includes('trends')) || 'https://trends.google.com',
        title: `Trending: ${ideaData.peptideCategory[0] || 'peptides'}`,
        rawContent: `Rising search interest detected`,
        metadata: { interest_value: ideaData.trendScore, percent_change_4w: Math.floor(Math.random() * 60) + 10, trend_direction: 'rising' },
        relevanceScore: 0.8 + Math.random() * 0.2,
      });
    }

    if (signalSets.length > 0) {
      await prisma.ideaSignal.createMany({ data: signalSets });
    }

    // Add trend data (last 12 weeks)
    const trendData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      trendData.push({
        ideaId: idea.id,
        metricType: 'google_interest',
        metricValue: Math.max(10, ideaData.trendScore - 20 + (11 - i) * 2 + Math.random() * 10),
        recordedAt: date,
      });
      trendData.push({
        ideaId: idea.id,
        metricType: 'reddit_mentions',
        metricValue: Math.floor(Math.random() * 30) + 5,
        recordedAt: date,
      });
    }
    await prisma.ideaTrend.createMany({ data: trendData });
  }

  // Add feedback for approved/declined ideas
  const approvedIdea = await prisma.idea.findUnique({ where: { slug: 'thymosin-alpha-1-immune-ebook' } });
  if (approvedIdea) {
    await prisma.ideaFeedback.create({
      data: { ideaId: approvedIdea.id, userId: user.id, action: 'approve', note: 'Strong niche, low competition. I can create this in a week.' },
    });
  }

  const declinedIdea = await prisma.idea.findUnique({ where: { slug: 'pt-141-sexual-wellness-guide' } });
  if (declinedIdea) {
    await prisma.ideaFeedback.create({
      data: { ideaId: declinedIdea.id, userId: user.id, action: 'decline', note: 'Too niche and the compliance risk is not worth the relatively low revenue potential.' },
    });
  }

  const starredIdea = await prisma.idea.findUnique({ where: { slug: 'peptide-interaction-checker' } });
  if (starredIdea) {
    await prisma.ideaFeedback.create({
      data: { ideaId: starredIdea.id, userId: user.id, action: 'star', note: 'Love this concept. Need to figure out the compliance angle first.' },
    });
  }

  // Seed golden rules
  const rules = [
    { userId: user.id, ruleType: 'must_have', ruleText: 'Product must have clear search demand (Google Trends interest > 40)', weight: 1.2, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'must_have', ruleText: 'Recurring revenue model preferred over one-time sales', weight: 1.5, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'must_have', ruleText: 'Product must be buildable in under 2 weeks', weight: 1.0, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'must_avoid', ruleText: 'No products that require showing my face on camera', weight: 1.0, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'must_avoid', ruleText: 'Avoid anything requiring medical credentials to sell legally', weight: 1.3, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'prefer', ruleText: 'SaaS/tool products over info products (ebooks, courses)', weight: 1.4, createdFrom: 'inferred' },
    { userId: user.id, ruleType: 'prefer', ruleText: 'Products that can be enhanced with AI over time', weight: 1.2, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'deprioritize', ruleText: 'Pure printables and low-ticket items under $10', weight: 0.8, createdFrom: 'manual' },
    { userId: user.id, ruleType: 'deprioritize', ruleText: 'Products competing directly with free YouTube content', weight: 0.9, createdFrom: 'inferred' },
  ];

  for (const rule of rules) {
    await prisma.goldenRule.create({ data: rule });
  }

  // Seed learned preferences
  const preferences = [
    { userId: user.id, preferenceKey: 'likes_saas_over_ebooks', preferenceValue: { direction: 'positive', saas_approval_rate: 0.8, ebook_approval_rate: 0.3 }, confidence: 0.85 },
    { userId: user.id, preferenceKey: 'values_recurring_revenue', preferenceValue: { direction: 'positive', subscription_preference: 0.9 }, confidence: 0.92 },
    { userId: user.id, preferenceKey: 'prefers_low_compliance_risk', preferenceValue: { direction: 'positive', green_approval_rate: 0.85, red_approval_rate: 0.1 }, confidence: 0.78 },
    { userId: user.id, preferenceKey: 'loves_calculator_tools', preferenceValue: { direction: 'positive', calculator_approval_rate: 0.9 }, confidence: 0.88 },
  ];

  for (const pref of preferences) {
    await prisma.userPreferenceLearned.create({ data: pref });
  }

  // Seed scraper runs
  const scraperRuns = [
    { scraperName: 'reddit', status: 'completed', signalsFound: 23, ideasGenerated: 4, completedAt: new Date() },
    { scraperName: 'google_trends', status: 'completed', signalsFound: 15, ideasGenerated: 2, completedAt: new Date() },
    { scraperName: 'youtube', status: 'completed', signalsFound: 18, ideasGenerated: 3, completedAt: new Date() },
    { scraperName: 'rss', status: 'completed', signalsFound: 8, ideasGenerated: 1, completedAt: new Date() },
    { scraperName: 'etsy', status: 'completed', signalsFound: 12, ideasGenerated: 2, completedAt: new Date() },
    { scraperName: 'reddit', status: 'running', signalsFound: 0, ideasGenerated: 0 },
  ];

for (const run of scraperRuns) {
    await prisma.scraperRun.create({ data: run });
  }

  // Clear existing notifications for this user (safe re-run)
  await prisma.notification.deleteMany({ where: { userId: user.id } });

  // Seed notifications
  const notifications = [
    {
      userId: user.id,
      type: 'system',
      title: 'Welcome to PeptideIQ!',
      message: 'Explore 12 fresh peptide product ideas pre-seeded for you.',
      link: '/ideas',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 2), // 2 min ago
    },
    {
      userId: user.id,
      type: 'new_idea',
      title: 'New idea discovered',
      message: 'BPC-157 Dosage & Reconstitution Calculator App added to your pipeline.',
      link: '/ideas',
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
    },
    {
      userId: user.id,
      type: 'scrape_completed',
      title: 'Reddit scraper completed',
      message: '23 signals found, 4 ideas generated.',
      link: null,
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 32), // 32 min ago
    },
    {
      userId: user.id,
      type: 'scrape_completed',
      title: 'YouTube scraper completed',
      message: '18 signals found, 3 ideas generated.',
      link: null,
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 45),
    },
    {
      userId: user.id,
      type: 'system',
      title: 'Golden rules updated',
      message: '9 golden rules loaded for your account.',
      link: '/rules',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
  ];
  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }

  console.log('Seed data created successfully!');
  console.log(`  - User: ${user.email}`);
  console.log(`  - Ideas: ${ideas.length}`);
  console.log(`  - Golden Rules: ${rules.length}`);
  console.log(`  - Learned Preferences: ${preferences.length}`);
  console.log(`  - Scraper Runs: ${scraperRuns.length}`);
  console.log(`  - Notifications: ${notifications.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

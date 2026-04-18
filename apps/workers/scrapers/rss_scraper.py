"""RSS feed scraper for news and research articles."""

import logging
from scrapers.base import BaseScraper, Signal
from config import RSS_FEEDS, SEED_KEYWORDS

logger = logging.getLogger(__name__)


class RSSScraper(BaseScraper):
    name = "rss"
    rate_limit_delay = 0.5

    async def scrape(self) -> list[Signal]:
        """Scrape RSS feeds."""
        try:
            import feedparser
        except ImportError:
            logger.error("feedparser not installed")
            return await self.mock_scrape()

        signals = []
        peptide_keywords = set(
            kw.lower() for keywords in SEED_KEYWORDS.values() for kw in keywords
        )

        for feed_url in RSS_FEEDS:
            try:
                feed = feedparser.parse(feed_url)
                for entry in feed.entries[:20]:
                    title = entry.get("title", "")
                    summary = entry.get("summary", "")
                    combined = f"{title} {summary}".lower()

                    # Check relevance
                    matching_keywords = [kw for kw in peptide_keywords if kw in combined]
                    if not matching_keywords:
                        continue

                    # Detect special triggers
                    is_fda = any(term in combined for term in ["fda", "regulation", "ban", "approved", "enforcement"])
                    is_new_research = any(term in combined for term in ["new study", "clinical trial", "research shows", "published"])
                    is_influencer = any(term in combined for term in ["huberman", "greenfield", "rogan", "attia"])

                    relevance = 0.5
                    if is_fda:
                        relevance = 0.95  # FDA news is highest priority
                    elif is_influencer:
                        relevance = 0.85
                    elif is_new_research:
                        relevance = 0.75

                    signals.append(Signal(
                        signal_type="rss_article",
                        source_url=entry.get("link", feed_url),
                        title=title,
                        raw_content=summary[:2000],
                        metadata={
                            "source_feed": feed_url,
                            "published": entry.get("published", ""),
                            "matching_keywords": matching_keywords,
                            "is_fda_related": is_fda,
                            "is_new_research": is_new_research,
                            "is_influencer_coverage": is_influencer,
                        },
                        relevance_score=relevance,
                    ))

            except Exception as e:
                logger.error(f"Error parsing feed {feed_url}: {e}")
                self.errors.append(str(e))

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return mock RSS data."""
        mock_articles = [
            {
                "title": "FDA Issues Updated Guidance on Compounded Peptide Therapies",
                "summary": "The FDA has released new guidance regarding the compounding of peptide therapies, affecting availability of BPC-157 and other research peptides.",
                "source": "Google News",
                "is_fda": True,
                "relevance": 0.95,
            },
            {
                "title": "New Study Shows GHK-Cu Promotes Wound Healing in Clinical Trial",
                "summary": "A double-blind clinical trial published in the Journal of Peptide Research demonstrates significant wound healing acceleration with GHK-Cu peptide.",
                "source": "PubMed",
                "is_fda": False,
                "relevance": 0.8,
            },
            {
                "title": "The Rise of Peptide Therapy: What Biohackers Need to Know",
                "summary": "Peptide therapy is gaining mainstream attention as more people seek performance optimization and longevity solutions outside traditional medicine.",
                "source": "Health Blog",
                "is_fda": False,
                "relevance": 0.65,
            },
            {
                "title": "Semaglutide Shortage Continues as Demand Surges",
                "summary": "The ongoing semaglutide shortage is driving patients to explore compounded alternatives and peptide suppliers.",
                "source": "Google News",
                "is_fda": True,
                "relevance": 0.9,
            },
            {
                "title": "Epithalon and Telomere Length: A Comprehensive Review",
                "summary": "Researchers review the evidence for epithalon's effects on telomere length and its potential role in anti-aging medicine.",
                "source": "PubMed",
                "is_fda": False,
                "relevance": 0.7,
            },
        ]

        signals = []
        for article in mock_articles:
            signals.append(Signal(
                signal_type="rss_article",
                source_url=f"https://news.example.com/article/{hash(article['title']) % 100000}",
                title=article["title"],
                raw_content=article["summary"],
                metadata={
                    "source_feed": article["source"],
                    "is_fda_related": article["is_fda"],
                    "is_new_research": "study" in article["title"].lower() or "trial" in article["title"].lower(),
                },
                relevance_score=article["relevance"],
            ))

        return signals

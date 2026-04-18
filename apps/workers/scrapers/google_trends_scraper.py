"""Google Trends scraper using pytrends."""

import logging
import random
from scrapers.base import BaseScraper, Signal
from config import SEED_KEYWORDS

logger = logging.getLogger(__name__)


class GoogleTrendsScraper(BaseScraper):
    name = "google_trends"
    rate_limit_delay = 12.0  # Max 5 requests/minute

    async def scrape(self) -> list[Signal]:
        """Scrape Google Trends for peptide keywords."""
        try:
            from pytrends.request import TrendReq
        except ImportError:
            logger.error("pytrends not installed")
            return await self.mock_scrape()

        pytrends = TrendReq(hl="en-US", tz=360)
        signals = []

        all_keywords = (
            SEED_KEYWORDS["core"]
            + SEED_KEYWORDS["specific_peptides"]
            + SEED_KEYWORDS["product_adjacent"]
        )

        # Process in batches of 5 (Google Trends limit)
        for i in range(0, len(all_keywords), 5):
            batch = all_keywords[i:i + 5]
            try:
                pytrends.build_payload(batch, timeframe="today 3-m", geo="US")

                # Interest over time
                interest_df = pytrends.interest_over_time()
                if not interest_df.empty:
                    for keyword in batch:
                        if keyword in interest_df.columns:
                            values = interest_df[keyword].values
                            current = float(values[-1]) if len(values) > 0 else 0
                            month_ago = float(values[-4]) if len(values) > 4 else current
                            pct_change = ((current - month_ago) / max(month_ago, 1)) * 100

                            direction = "rising" if pct_change > 10 else "stable" if pct_change > -10 else "declining"

                            if current > 20 or pct_change > 25:
                                signals.append(Signal(
                                    signal_type="google_trend",
                                    source_url=f"https://trends.google.com/trends/explore?q={keyword.replace(' ', '+')}",
                                    title=f"Trending: {keyword}",
                                    raw_content=f"{keyword} interest: {current}/100, {pct_change:+.0f}% change (4 weeks)",
                                    metadata={
                                        "keyword": keyword,
                                        "interest_value": current,
                                        "percent_change_4w": round(pct_change, 1),
                                        "trend_direction": direction,
                                    },
                                    relevance_score=min(1.0, current / 100 + abs(pct_change) / 200),
                                ))

                # Related queries
                related = pytrends.related_queries()
                for keyword in batch:
                    if keyword in related and related[keyword]["rising"] is not None:
                        rising_df = related[keyword]["rising"]
                        for _, row in rising_df.head(5).iterrows():
                            query = row.get("query", "")
                            value = row.get("value", 0)
                            if any(p.lower() in query.lower() for p in SEED_KEYWORDS["core"]):
                                signals.append(Signal(
                                    signal_type="google_trend",
                                    source_url=f"https://trends.google.com/trends/explore?q={query.replace(' ', '+')}",
                                    title=f"Rising query: {query}",
                                    raw_content=f"Related to '{keyword}', breakout value: {value}",
                                    metadata={
                                        "keyword": query,
                                        "parent_keyword": keyword,
                                        "breakout_value": int(value),
                                        "trend_direction": "rising",
                                    },
                                    relevance_score=min(1.0, 0.7 + value / 1000),
                                ))

                await self.rate_limit()

            except Exception as e:
                logger.error(f"Error with batch {batch}: {e}")
                self.errors.append(str(e))

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return mock Google Trends data."""
        mock_trends = [
            {"keyword": "BPC-157 dosage guide", "interest": 78, "change": 45, "direction": "rising"},
            {"keyword": "peptide reconstitution", "interest": 62, "change": 32, "direction": "rising"},
            {"keyword": "semaglutide tracker", "interest": 91, "change": 67, "direction": "rising"},
            {"keyword": "peptide for beginners", "interest": 85, "change": 28, "direction": "rising"},
            {"keyword": "GHK-Cu skincare", "interest": 55, "change": 18, "direction": "rising"},
            {"keyword": "peptide stacking", "interest": 48, "change": 12, "direction": "stable"},
            {"keyword": "epithalon anti-aging", "interest": 42, "change": 35, "direction": "rising"},
            {"keyword": "peptide calculator", "interest": 71, "change": 52, "direction": "rising"},
            {"keyword": "CJC-1295 ipamorelin", "interest": 58, "change": -5, "direction": "stable"},
            {"keyword": "tirzepatide weight loss", "interest": 88, "change": 73, "direction": "rising"},
        ]

        signals = []
        for trend in mock_trends:
            signals.append(Signal(
                signal_type="google_trend",
                source_url=f"https://trends.google.com/trends/explore?q={trend['keyword'].replace(' ', '+')}",
                title=f"Trending: {trend['keyword']}",
                raw_content=f"{trend['keyword']} interest: {trend['interest']}/100, {trend['change']:+d}% change (4 weeks)",
                metadata={
                    "keyword": trend["keyword"],
                    "interest_value": trend["interest"],
                    "percent_change_4w": trend["change"],
                    "trend_direction": trend["direction"],
                    "related_rising_queries": [f"{trend['keyword']} {suffix}" for suffix in ["guide", "review", "protocol"]],
                },
                relevance_score=min(1.0, trend["interest"] / 100 + abs(trend["change"]) / 200),
            ))

        return signals

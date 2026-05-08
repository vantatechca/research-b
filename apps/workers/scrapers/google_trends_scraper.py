"""Google Trends scraper using SerpAPI.

Switched from pytrends because Render's network couldn't reliably reach
Webshare proxies for Google Trends (local works fine, Render hangs).
SerpAPI bypasses proxies entirely — direct HTTPS to api.serpapi.com.

Pricing notes:
- Free tier: 100 searches/month
- $50/mo Developer: 5,000 searches/month
- Each scrape ≈ 6 searches (one per 5-keyword batch via TIMESERIES)
- Daily scraping = ~180 searches/month → needs paid tier
- Weekly scraping = ~24 searches/month → fits free tier
"""

import logging
import os
from urllib.parse import urlencode

from scrapers.base import BaseScraper, Signal
from config import SEED_KEYWORDS

logger = logging.getLogger(__name__)


class GoogleTrendsScraper(BaseScraper):
    name = "google_trends"
    rate_limit_delay = 1.0  # SerpAPI is generous; no aggressive throttling

    async def scrape(self) -> list[Signal]:
        api_key = os.getenv("SERPAPI_KEY", "").strip()
        if not api_key:
            logger.warning("  SERPAPI_KEY not set — using mock data")
            return await self.mock_scrape()

        signals: list[Signal] = []
        all_keywords = (
            SEED_KEYWORDS["core"]
            + SEED_KEYWORDS["specific_peptides"]
            + SEED_KEYWORDS["product_adjacent"]
        )

        # Process in batches of 5 (Google Trends comparison limit)
        for i in range(0, len(all_keywords), 5):
            batch = all_keywords[i:i + 5]
            try:
                data = await self._serpapi_call({
                    "engine": "google_trends",
                    "q": ",".join(batch),
                    "data_type": "TIMESERIES",
                    "date": "today 3-m",
                    "geo": "US",
                    "api_key": api_key,
                })
                signals.extend(self._parse_timeseries(data, batch))
                await self.rate_limit()

            except Exception as e:
                logger.error(f"Error with batch {batch}: {e}")
                self.errors.append(str(e))

        logger.info(f"  google_trends: {len(signals)} signals via SerpAPI")
        return signals

    async def _serpapi_call(self, params: dict) -> dict:
        url = "https://serpapi.com/search?" + urlencode(params)
        resp = await self.client.get(url)
        if resp.status_code != 200:
            raise Exception(f"SerpAPI {resp.status_code}: {resp.text[:200]}")
        return resp.json()

    def _parse_timeseries(self, data: dict, keywords: list[str]) -> list[Signal]:
        """Convert SerpAPI's interest_over_time response into Signals."""
        out: list[Signal] = []
        timeline = (data.get("interest_over_time") or {}).get("timeline_data", [])
        if not timeline:
            return out

        # SerpAPI returns a values array per timeline point, indexed in
        # the same order as the keywords we sent.
        for kw_idx, keyword in enumerate(keywords):
            values: list[float] = []
            for point in timeline:
                kw_values = point.get("values", [])
                if kw_idx < len(kw_values):
                    raw = kw_values[kw_idx].get("extracted_value", 0)
                    try:
                        values.append(float(raw))
                    except (TypeError, ValueError):
                        values.append(0.0)
            if not values:
                continue

            current = values[-1]
            month_ago = values[-4] if len(values) > 4 else current
            pct_change = ((current - month_ago) / max(month_ago, 1)) * 100

            if pct_change > 10:
                direction = "rising"
            elif pct_change > -10:
                direction = "stable"
            else:
                direction = "declining"

            # Same filter as the pytrends version: meaningful interest
            # OR meaningful change worth flagging.
            if current > 20 or pct_change > 25:
                out.append(Signal(
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
        return out

    async def mock_scrape(self) -> list[Signal]:
        """Mock data when SERPAPI_KEY is missing or for local dev."""
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
        for t in mock_trends:
            signals.append(Signal(
                signal_type="google_trend",
                source_url=f"https://trends.google.com/trends/explore?q={t['keyword'].replace(' ', '+')}",
                title=f"Trending: {t['keyword']}",
                raw_content=f"{t['keyword']} interest: {t['interest']}/100, {t['change']:+}% change (4 weeks)",
                metadata={
                    "keyword": t["keyword"],
                    "interest_value": t["interest"],
                    "percent_change_4w": t["change"],
                    "trend_direction": t["direction"],
                },
                relevance_score=min(1.0, t["interest"] / 100 + abs(t["change"]) / 200),
            ))
        return signals
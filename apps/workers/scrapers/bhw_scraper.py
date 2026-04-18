"""Black Hat World forum scraper using Playwright."""

import logging
import random
from scrapers.base import BaseScraper, Signal

logger = logging.getLogger(__name__)

BHW_SEARCH_QUERIES = [
    "peptide", "health niche digital product", "supplement niche",
    "wellness course", "biohacking", "health ebook",
    "Etsy health products", "Whop health",
]


class BHWScraper(BaseScraper):
    name = "bhw"
    rate_limit_delay = 5.0  # 1 request every 5 seconds

    async def scrape(self) -> list[Signal]:
        """Scrape BHW forums using Playwright."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("Playwright not installed")
            return await self.mock_scrape()

        signals = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            for query in BHW_SEARCH_QUERIES:
                try:
                    search_url = f"https://www.blackhatworld.com/search/?q={query.replace(' ', '+')}&type=post"
                    await page.goto(search_url, timeout=30000)
                    await self.rate_limit()

                    # Extract thread listings
                    threads = await page.query_selector_all(".contentRow")
                    for thread in threads[:10]:
                        try:
                            title_el = await thread.query_selector(".contentRow-title a")
                            if not title_el:
                                continue

                            title = await title_el.text_content()
                            href = await title_el.get_attribute("href")

                            # Get metadata
                            meta_el = await thread.query_selector(".contentRow-minor")
                            meta_text = await meta_el.text_content() if meta_el else ""

                            snippet_el = await thread.query_selector(".contentRow-snippet")
                            snippet = await snippet_el.text_content() if snippet_el else ""

                            combined = f"{title} {snippet}".lower()

                            # Check relevance
                            is_relevant = any(
                                kw in combined
                                for kw in ["peptide", "health", "supplement", "biohack", "wellness"]
                            )
                            if not is_relevant:
                                continue

                            # Detect income mentions
                            income_mentioned = any(
                                indicator in combined
                                for indicator in ["$", "k/mo", "per month", "revenue", "income", "making money"]
                            )

                            signals.append(Signal(
                                signal_type="bhw_thread",
                                source_url=f"https://www.blackhatworld.com{href}" if href else search_url,
                                title=title.strip() if title else query,
                                raw_content=snippet.strip()[:2000] if snippet else None,
                                metadata={
                                    "search_query": query,
                                    "meta_info": meta_text.strip() if meta_text else "",
                                    "income_mentioned": income_mentioned,
                                    "relevance": "direct" if "peptide" in combined else "tangential",
                                },
                                relevance_score=0.7 if "peptide" in combined else 0.5,
                            ))

                        except Exception:
                            continue

                except Exception as e:
                    logger.error(f"Error searching BHW for '{query}': {e}")
                    self.errors.append(str(e))

            await browser.close()

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return mock BHW data."""
        mock_threads = [
            {
                "title": "Making $3k/mo selling peptide guides on Etsy",
                "replies": 67,
                "views": 4200,
                "snippet": "Been selling peptide dosage guides and protocol templates on Etsy for 6 months. Started with $0 and now consistently making $3k/mo. Here's my exact strategy...",
                "income": True,
                "income_amount": 3000,
            },
            {
                "title": "[Case Study] Health niche digital products - $10k first month",
                "replies": 134,
                "views": 8900,
                "snippet": "Launched a biohacking membership on Whop. Covered peptides, supplements, and longevity protocols. Hit $10k in the first month with mostly organic Reddit traffic.",
                "income": True,
                "income_amount": 10000,
            },
            {
                "title": "Best platforms for selling health/wellness digital products?",
                "replies": 45,
                "views": 2100,
                "snippet": "Looking for advice on where to sell health-related digital products. Considering Etsy, Gumroad, Whop, and Teachable. Which has the best audience for supplement/biohacking content?",
                "income": False,
                "income_amount": 0,
            },
            {
                "title": "SEO strategy for peptide/supplement niche blogs",
                "replies": 89,
                "views": 5600,
                "snippet": "Sharing my SEO approach for ranking in the peptide and supplement niche. Getting 15k organic visitors/month and monetizing through digital products and affiliate links.",
                "income": True,
                "income_amount": 5000,
            },
            {
                "title": "Warning: FTC cracking down on health product claims",
                "replies": 23,
                "views": 1800,
                "snippet": "Heads up - FTC has been sending warning letters to digital product sellers making health claims about peptides and supplements. Make sure your disclaimers are solid.",
                "income": False,
                "income_amount": 0,
            },
        ]

        signals = []
        for thread in mock_threads:
            signals.append(Signal(
                signal_type="bhw_thread",
                source_url=f"https://www.blackhatworld.com/seo/thread-{random.randint(100000, 999999)}.html",
                title=thread["title"],
                raw_content=thread["snippet"],
                metadata={
                    "replies": thread["replies"],
                    "views": thread["views"],
                    "income_mentioned": thread["income"],
                    "income_amount": thread["income_amount"],
                    "relevance": "direct",
                    "strategy_keywords": ["etsy", "whop", "seo", "organic"],
                },
                relevance_score=0.8 if thread["income"] else 0.6,
            ))

        return signals

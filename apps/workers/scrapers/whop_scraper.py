"""Whop.com digital product marketplace scraper."""

import logging
import random
from scrapers.base import BaseScraper, Signal

logger = logging.getLogger(__name__)

WHOP_SEARCH_QUERIES = [
    "peptide", "peptides", "BPC-157", "biohacking", "longevity",
    "health protocol", "supplement guide", "fitness protocol",
]


class WhopScraper(BaseScraper):
    name = "whop"
    rate_limit_delay = 10.0

    async def scrape(self) -> list[Signal]:
        """Scrape Whop.com for peptide-related products."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("Playwright not installed")
            return await self.mock_scrape()

        signals = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            for query in WHOP_SEARCH_QUERIES:
                try:
                    url = f"https://whop.com/search/?query={query.replace(' ', '+')}"
                    await page.goto(url, timeout=30000)
                    await self.rate_limit()

                    # Whop uses dynamic rendering; wait for content
                    await page.wait_for_selector("[class*='product']", timeout=10000).catch(lambda _: None)

                    products = await page.query_selector_all("[class*='product'], [class*='card']")
                    for product in products[:10]:
                        try:
                            title_el = await product.query_selector("h2, h3, [class*='title']")
                            title = await title_el.text_content() if title_el else ""

                            price_el = await product.query_selector("[class*='price']")
                            price_text = await price_el.text_content() if price_el else ""

                            link_el = await product.query_selector("a")
                            href = await link_el.get_attribute("href") if link_el else ""

                            member_el = await product.query_selector("[class*='member'], [class*='count']")
                            member_text = await member_el.text_content() if member_el else ""

                            if title:
                                signals.append(Signal(
                                    signal_type="whop_product",
                                    source_url=f"https://whop.com{href}" if href and href.startswith("/") else (href or url),
                                    title=title.strip(),
                                    raw_content=f"Whop product: {title.strip()}",
                                    metadata={
                                        "price_text": price_text.strip() if price_text else "",
                                        "member_text": member_text.strip() if member_text else "",
                                        "search_query": query,
                                    },
                                    relevance_score=0.7,
                                ))

                        except Exception:
                            continue

                except Exception as e:
                    logger.error(f"Error scraping Whop for '{query}': {e}")
                    self.errors.append(str(e))

            await browser.close()

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return mock Whop data."""
        mock_products = [
            {
                "title": "Peptide Mastery Course - From Beginner to Expert",
                "price": 97,
                "price_type": "one-time",
                "members": 450,
                "creator": "PeptidePro",
                "has_community": True,
                "has_course": True,
            },
            {
                "title": "Biohacker's Toolkit - Peptide Protocols & Stacking Guides",
                "price": 29,
                "price_type": "monthly",
                "members": 820,
                "creator": "OptimizeHealth",
                "has_community": True,
                "has_course": True,
            },
            {
                "title": "The Longevity Protocol - Anti-Aging Peptide Membership",
                "price": 49,
                "price_type": "monthly",
                "members": 320,
                "creator": "LongevityLab",
                "has_community": True,
                "has_course": False,
            },
            {
                "title": "Semaglutide Success Community",
                "price": 19,
                "price_type": "monthly",
                "members": 1250,
                "creator": "WeightLossWins",
                "has_community": True,
                "has_course": False,
            },
            {
                "title": "Peptide Protocol Templates Pack",
                "price": 47,
                "price_type": "one-time",
                "members": 180,
                "creator": "PeptideGuides",
                "has_community": False,
                "has_course": False,
            },
        ]

        signals = []
        for product in mock_products:
            signals.append(Signal(
                signal_type="whop_product",
                source_url=f"https://whop.com/{product['creator'].lower()}-{random.randint(1000, 9999)}",
                title=product["title"],
                raw_content=f"Whop product by {product['creator']}: {product['title']}",
                metadata={
                    "price": product["price"],
                    "price_type": product["price_type"],
                    "members": product["members"],
                    "creator": product["creator"],
                    "has_community": product["has_community"],
                    "has_course": product["has_course"],
                    "is_subscription": product["price_type"] == "monthly",
                },
                relevance_score=min(1.0, 0.4 + (product["members"] / 1500)),
            ))

        return signals

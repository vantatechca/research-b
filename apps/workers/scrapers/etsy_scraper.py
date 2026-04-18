"""Etsy marketplace scraper using Playwright."""

import logging
import random
from scrapers.base import BaseScraper, Signal

logger = logging.getLogger(__name__)

ETSY_SEARCH_QUERIES = [
    "peptide guide", "peptide planner", "peptide tracker", "peptide protocol",
    "peptide journal", "peptide log", "peptide printable",
    "BPC-157 guide", "peptide dosage chart",
    "biohacking planner", "supplement tracker",
]


class EtsyScraper(BaseScraper):
    name = "etsy"
    rate_limit_delay = 10.0  # 1 request every 10 seconds

    async def scrape(self) -> list[Signal]:
        """Scrape Etsy for peptide-related digital products."""
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.error("Playwright not installed")
            return await self.mock_scrape()

        signals = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            for query in ETSY_SEARCH_QUERIES:
                try:
                    url = f"https://www.etsy.com/search?q={query.replace(' ', '+')}&explicit=1&ship_to=US"
                    await page.goto(url, timeout=30000)
                    await self.rate_limit()

                    listings = await page.query_selector_all("[data-listing-id]")
                    for listing in listings[:10]:
                        try:
                            title_el = await listing.query_selector("h3")
                            title = await title_el.text_content() if title_el else ""

                            price_el = await listing.query_selector(".currency-value")
                            price_text = await price_el.text_content() if price_el else "0"
                            price = float(price_text.replace(",", "")) if price_text else 0

                            link_el = await listing.query_selector("a")
                            href = await link_el.get_attribute("href") if link_el else ""

                            # Estimate sales from review count (rough: reviews × 10)
                            review_el = await listing.query_selector("[aria-label*='star']")
                            review_text = await review_el.text_content() if review_el else ""

                            listing_id = await listing.get_attribute("data-listing-id")

                            signals.append(Signal(
                                signal_type="etsy_listing",
                                source_url=href or f"https://www.etsy.com/listing/{listing_id}",
                                title=title.strip() if title else query,
                                raw_content=f"Etsy listing for '{query}'",
                                metadata={
                                    "price": price,
                                    "search_query": query,
                                    "listing_id": listing_id,
                                    "review_info": review_text.strip() if review_text else "",
                                },
                                relevance_score=0.7,
                            ))

                        except Exception:
                            continue

                except Exception as e:
                    logger.error(f"Error scraping Etsy for '{query}': {e}")
                    self.errors.append(str(e))

            await browser.close()

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return mock Etsy data."""
        mock_listings = [
            {
                "title": "BPC-157 Dosage Chart & Protocol Guide | Digital Download PDF",
                "price": 5.99,
                "reviews": 234,
                "rating": 4.7,
                "estimated_sales": 2340,
                "shop": "PeptideGuides",
            },
            {
                "title": "Peptide Reconstitution Calculator Spreadsheet | Excel Template",
                "price": 11.99,
                "reviews": 89,
                "rating": 4.5,
                "estimated_sales": 890,
                "shop": "BiohackTools",
            },
            {
                "title": "Peptide Cycle Tracker Journal | Printable PDF Planner",
                "price": 7.99,
                "reviews": 156,
                "rating": 4.8,
                "estimated_sales": 1560,
                "shop": "WellnessTrackers",
            },
            {
                "title": "Complete Peptide Stacking Guide | BPC-157, GHK-Cu, TB-500",
                "price": 14.99,
                "reviews": 67,
                "rating": 4.3,
                "estimated_sales": 670,
                "shop": "PeptideAcademy",
            },
            {
                "title": "Biohacking Protocol Planner | Supplements & Peptides Tracker",
                "price": 9.99,
                "reviews": 312,
                "rating": 4.6,
                "estimated_sales": 3120,
                "shop": "OptimizeLife",
            },
            {
                "title": "Peptide Storage & Handling Quick Reference Card | Printable",
                "price": 3.99,
                "reviews": 45,
                "rating": 4.9,
                "estimated_sales": 450,
                "shop": "LabSupplyDigital",
            },
            {
                "title": "Semaglutide Weight Loss Tracker | Weekly Progress Journal",
                "price": 8.99,
                "reviews": 567,
                "rating": 4.7,
                "estimated_sales": 5670,
                "shop": "HealthJournals",
            },
        ]

        signals = []
        for listing in mock_listings:
            signals.append(Signal(
                signal_type="etsy_listing",
                source_url=f"https://etsy.com/listing/{random.randint(1000000000, 9999999999)}",
                title=listing["title"],
                raw_content=f"Etsy shop: {listing['shop']}, Price: ${listing['price']}, {listing['reviews']} reviews",
                metadata={
                    "price": listing["price"],
                    "reviews": listing["reviews"],
                    "rating": listing["rating"],
                    "estimated_sales": listing["estimated_sales"],
                    "shop_name": listing["shop"],
                    "is_digital": True,
                },
                relevance_score=min(1.0, 0.5 + (listing["estimated_sales"] / 5000)),
            ))

        return signals

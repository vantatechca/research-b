"""YouTube scraper using Data API v3."""

import logging
import random
from scrapers.base import BaseScraper, Signal
from config import YOUTUBE_API_KEY, SEED_KEYWORDS

logger = logging.getLogger(__name__)


class YouTubeScraper(BaseScraper):
    name = "youtube"
    rate_limit_delay = 0.5

    async def scrape(self) -> list[Signal]:
        """Scrape YouTube using Data API v3."""
        if not YOUTUBE_API_KEY:
            logger.warning("YouTube API key not configured")
            return await self.mock_scrape()

        signals = []
        search_queries = (
            SEED_KEYWORDS["product_adjacent"]
            + [f"{p} guide" for p in SEED_KEYWORDS["specific_peptides"][:8]]
            + ["peptide business", "selling health products online", "digital product peptides"]
        )

        for query in search_queries[:15]:  # Limit to manage API quota
            try:
                response = await self.client.get(
                    "https://www.googleapis.com/youtube/v3/search",
                    params={
                        "part": "snippet",
                        "q": query,
                        "type": "video",
                        "order": "relevance",
                        "maxResults": 5,
                        "publishedAfter": "2025-01-01T00:00:00Z",
                        "key": YOUTUBE_API_KEY,
                    },
                )
                data = response.json()

                if "items" not in data:
                    continue

                video_ids = [item["id"]["videoId"] for item in data["items"]]

                # Get video statistics
                stats_response = await self.client.get(
                    "https://www.googleapis.com/youtube/v3/videos",
                    params={
                        "part": "statistics,snippet",
                        "id": ",".join(video_ids),
                        "key": YOUTUBE_API_KEY,
                    },
                )
                stats_data = stats_response.json()

                for video in stats_data.get("items", []):
                    stats = video.get("statistics", {})
                    snippet = video.get("snippet", {})
                    views = int(stats.get("viewCount", 0))
                    likes = int(stats.get("likeCount", 0))
                    comments = int(stats.get("commentCount", 0))

                    # Check for product links in description
                    description = snippet.get("description", "")
                    has_product_link = any(
                        domain in description.lower()
                        for domain in ["whop.com", "gumroad.com", "etsy.com", "teachable.com", "kajabi.com", "stan.store"]
                    )

                    if views > 1000:  # Only track videos with some traction
                        signals.append(Signal(
                            signal_type="youtube_video",
                            source_url=f"https://youtube.com/watch?v={video['id']}",
                            title=snippet.get("title", ""),
                            raw_content=description[:1000],
                            metadata={
                                "channel": snippet.get("channelTitle", ""),
                                "views": views,
                                "likes": likes,
                                "comments": comments,
                                "upload_date": snippet.get("publishedAt", ""),
                                "has_product_link": has_product_link,
                                "search_query": query,
                            },
                            relevance_score=min(1.0, 0.3 + (views / 100000) + (0.2 if has_product_link else 0)),
                        ))

                await self.rate_limit()

            except Exception as e:
                logger.error(f"Error searching YouTube for '{query}': {e}")
                self.errors.append(str(e))

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return mock YouTube data."""
        mock_videos = [
            {
                "title": "Complete BPC-157 Guide for Beginners (2026)",
                "channel": "PeptideScience",
                "subscribers": 45000,
                "views": 125000,
                "likes": 3400,
                "comments": 280,
                "has_product": True,
                "product_url": "https://whop.com/peptide-mastery/",
            },
            {
                "title": "How to Reconstitute Peptides - Step by Step Tutorial",
                "channel": "BiohackersLab",
                "subscribers": 82000,
                "views": 89000,
                "likes": 2100,
                "comments": 156,
                "has_product": False,
                "product_url": None,
            },
            {
                "title": "My Semaglutide Weight Loss Journey - 6 Month Update",
                "channel": "HealthOptimized",
                "subscribers": 120000,
                "views": 340000,
                "likes": 8900,
                "comments": 672,
                "has_product": True,
                "product_url": "https://stan.store/health-tracker",
            },
            {
                "title": "GHK-Cu for Skin: Does This Peptide Actually Work?",
                "channel": "SkinScience",
                "subscribers": 35000,
                "views": 67000,
                "likes": 1800,
                "comments": 134,
                "has_product": False,
                "product_url": None,
            },
            {
                "title": "Best Peptide Stack for Recovery in 2026",
                "channel": "PeptidePro",
                "subscribers": 28000,
                "views": 45000,
                "likes": 1200,
                "comments": 89,
                "has_product": True,
                "product_url": "https://gumroad.com/l/peptide-stacking",
            },
            {
                "title": "Peptide Dosage Calculator - I Built a Free Tool",
                "channel": "DevBiohacker",
                "subscribers": 5000,
                "views": 12000,
                "likes": 450,
                "comments": 67,
                "has_product": True,
                "product_url": "https://peptidecalc.com",
            },
        ]

        signals = []
        for video in mock_videos:
            signals.append(Signal(
                signal_type="youtube_video",
                source_url=f"https://youtube.com/watch?v={''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=11))}",
                title=video["title"],
                raw_content=f"Video by {video['channel']} about {video['title']}",
                metadata={
                    "channel": video["channel"],
                    "channel_subscribers": video["subscribers"],
                    "views": video["views"],
                    "likes": video["likes"],
                    "comments": video["comments"],
                    "has_product_link": video["has_product"],
                    "product_links": [video["product_url"]] if video["product_url"] else [],
                },
                relevance_score=min(1.0, 0.3 + (video["views"] / 200000) + (0.2 if video["has_product"] else 0)),
            ))

        return signals

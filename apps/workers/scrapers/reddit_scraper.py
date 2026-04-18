"""Reddit scraper using PRAW."""

import logging
import random
from datetime import datetime, timezone

from scrapers.base import BaseScraper, Signal
from config import (
    REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT,
    TARGET_SUBREDDITS, SEED_KEYWORDS,
)

logger = logging.getLogger(__name__)

# Question indicators for demand detection
QUESTION_KEYWORDS = [
    "looking for", "wish there was", "anyone know a tool",
    "spreadsheet", "calculator", "guide", "course", "recommendation",
    "how to", "best way to", "help me understand", "confused about",
    "where can i find", "does anyone have", "is there a",
]


class RedditScraper(BaseScraper):
    name = "reddit"
    rate_limit_delay = 1.0  # 60 requests/minute

    async def scrape(self) -> list[Signal]:
        """Scrape Reddit using PRAW."""
        try:
            import praw
        except ImportError:
            logger.error("PRAW not installed. Run: pip install praw")
            return []

        if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
            logger.warning("Reddit API credentials not configured")
            return await self.mock_scrape()

        reddit = praw.Reddit(
            client_id=REDDIT_CLIENT_ID,
            client_secret=REDDIT_CLIENT_SECRET,
            user_agent=REDDIT_USER_AGENT,
        )

        signals = []
        for subreddit_name in TARGET_SUBREDDITS:
            try:
                subreddit = reddit.subreddit(subreddit_name)

                # Get new posts (last 24 hours)
                for post in subreddit.new(limit=25):
                    title_lower = post.title.lower()
                    body_lower = (post.selftext or "").lower()
                    combined = f"{title_lower} {body_lower}"

                    # Check for peptide relevance
                    is_relevant = any(
                        kw.lower() in combined
                        for keywords in SEED_KEYWORDS.values()
                        for kw in keywords
                    )
                    if not is_relevant:
                        continue

                    # Detect question/demand signals
                    question_detected = any(q in combined for q in QUESTION_KEYWORDS)
                    pain_points = [q for q in QUESTION_KEYWORDS if q in combined]

                    # Calculate demand indicator
                    demand = "low"
                    if post.score > 50 or (question_detected and post.num_comments > 10):
                        demand = "high"
                    elif post.score > 20 or post.num_comments > 5:
                        demand = "medium"

                    signals.append(Signal(
                        signal_type="reddit_post",
                        source_url=f"https://reddit.com{post.permalink}",
                        title=post.title,
                        raw_content=post.selftext[:2000] if post.selftext else None,
                        metadata={
                            "subreddit": f"r/{subreddit_name}",
                            "upvotes": post.score,
                            "comment_count": post.num_comments,
                            "flair": post.link_flair_text,
                            "author": str(post.author),
                            "question_detected": question_detected,
                            "pain_point_keywords": pain_points,
                            "demand_indicator": demand,
                            "created_utc": post.created_utc,
                        },
                        relevance_score=min(1.0, 0.5 + (post.score / 200) + (0.2 if question_detected else 0)),
                    ))

                    await self.rate_limit()

                # Get top posts this week
                for post in subreddit.top(time_filter="week", limit=10):
                    combined = f"{post.title.lower()} {(post.selftext or '').lower()}"
                    is_relevant = any(
                        kw.lower() in combined
                        for keywords in SEED_KEYWORDS.values()
                        for kw in keywords
                    )
                    if is_relevant and post.score > 50:
                        signals.append(Signal(
                            signal_type="reddit_post",
                            source_url=f"https://reddit.com{post.permalink}",
                            title=f"[TOP] {post.title}",
                            raw_content=post.selftext[:2000] if post.selftext else None,
                            metadata={
                                "subreddit": f"r/{subreddit_name}",
                                "upvotes": post.score,
                                "comment_count": post.num_comments,
                                "is_top_post": True,
                                "demand_indicator": "high",
                            },
                            relevance_score=min(1.0, 0.7 + (post.score / 500)),
                        ))

            except Exception as e:
                logger.error(f"Error scraping r/{subreddit_name}: {e}")
                self.errors.append(f"r/{subreddit_name}: {str(e)}")

        return signals

    async def mock_scrape(self) -> list[Signal]:
        """Return realistic mock Reddit signals."""
        mock_posts = [
            {
                "title": "Is there a good BPC-157 dosage calculator?",
                "subreddit": "r/Peptides",
                "upvotes": 87,
                "comments": 43,
                "body": "I keep seeing different dosage recommendations everywhere. Some say 250mcg twice daily, others say it depends on body weight. Is there any tool or calculator that can help me figure out the right dose? I have a 5mg vial and bacteriostatic water but the math is confusing me.",
                "question": True,
                "pain_points": ["calculator", "dosage", "confused about"],
            },
            {
                "title": "My BPC-157 reconstitution guide (with photos)",
                "subreddit": "r/Peptides",
                "upvotes": 156,
                "comments": 72,
                "body": "After seeing so many questions about reconstitution, I made a step-by-step guide with photos. I've been using BPC-157 for 6 months now and wanted to share what I've learned.",
                "question": False,
                "pain_points": ["guide"],
            },
            {
                "title": "Best peptide stack for injury recovery?",
                "subreddit": "r/Peptides",
                "upvotes": 64,
                "comments": 38,
                "body": "Tore my rotator cuff and looking for advice on stacking peptides for recovery. Currently considering BPC-157 + TB-500 but not sure about timing and dosing when combining them.",
                "question": True,
                "pain_points": ["best way to", "looking for"],
            },
            {
                "title": "Wish there was a peptide interaction checker",
                "subreddit": "r/Peptides",
                "upvotes": 112,
                "comments": 56,
                "body": "I'm on BPC-157, GHK-Cu, and taking several supplements. No resource exists that tells you about interactions between peptides and supplements. Someone should build this.",
                "question": True,
                "pain_points": ["wish there was"],
            },
            {
                "title": "GHK-Cu results for skin after 3 months",
                "subreddit": "r/SkincareAddiction",
                "upvotes": 203,
                "comments": 89,
                "body": "Posting my 3-month progress with GHK-Cu copper peptide serum. The difference in fine lines is remarkable. Happy to share my protocol.",
                "question": False,
                "pain_points": [],
            },
            {
                "title": "How to track semaglutide progress effectively?",
                "subreddit": "r/Biohackers",
                "upvotes": 95,
                "comments": 41,
                "body": "Started semaglutide 3 weeks ago. Looking for a good way to track doses, weight, measurements and side effects. Spreadsheets are getting messy. Anyone know a good app for this?",
                "question": True,
                "pain_points": ["looking for", "anyone know a tool"],
            },
            {
                "title": "Epithalon (Epitalon) - anyone have long-term experience?",
                "subreddit": "r/Longevity",
                "upvotes": 78,
                "comments": 34,
                "body": "Interested in epithalon for telomere support. Hard to find real user experiences beyond the basic research summaries. Looking for people who've been using it for 6+ months.",
                "question": True,
                "pain_points": ["looking for", "help me understand"],
            },
            {
                "title": "Complete guide to peptide storage - stop losing potency",
                "subreddit": "r/Peptides",
                "upvotes": 234,
                "comments": 67,
                "body": "Seeing too many posts about peptides losing effectiveness. Here's everything you need to know about proper storage.",
                "question": False,
                "pain_points": ["guide"],
            },
        ]

        signals = []
        for post in mock_posts:
            signals.append(Signal(
                signal_type="reddit_post",
                source_url=f"https://reddit.com/{post['subreddit']}/comments/{random.randint(100000, 999999)}",
                title=post["title"],
                raw_content=post["body"],
                metadata={
                    "subreddit": post["subreddit"],
                    "upvotes": post["upvotes"],
                    "comment_count": post["comments"],
                    "question_detected": post["question"],
                    "pain_point_keywords": post["pain_points"],
                    "demand_indicator": "high" if post["upvotes"] > 50 else "medium",
                },
                relevance_score=min(1.0, 0.5 + (post["upvotes"] / 200)),
            ))

        return signals

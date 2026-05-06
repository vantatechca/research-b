"""Reddit scraper using public .json endpoints (no auth required).

Reddit closed self-service API key creation in November 2025. To avoid the
~7-day approval process for OAuth credentials, this scraper uses Reddit's
public unauthenticated JSON endpoints. Trade-offs:

  - No OAuth: no client_id/secret needed, no approval queue
  - Lower rate limit: ~10 req/min (vs 60 with auth)
  - Read-only: cannot post, vote, or comment (we don't need that anyway)
  - User-Agent must be unique and descriptive (Reddit blocks generic UAs)

Endpoints used:
  GET https://www.reddit.com/r/{sub}/new.json?limit=25
  GET https://www.reddit.com/r/{sub}/top.json?t=week&limit=10

Both return the same Listing/t3 (post) JSON shape PRAW would give us — we
just unwrap it manually.
"""

import logging

import httpx

from scrapers.base import BaseScraper, Signal
from config import TARGET_SUBREDDITS, SEED_KEYWORDS, REDDIT_USER_AGENT

logger = logging.getLogger(__name__)

# Same heuristics as the old PRAW-backed scraper — keeps the Signal contract identical.
QUESTION_KEYWORDS = [
    "looking for", "wish there was", "anyone know a tool",
    "spreadsheet", "calculator", "guide", "course", "recommendation",
    "how to", "best way to", "help me understand", "confused about",
    "where can i find", "does anyone have", "is there a",
]


class RedditScraper(BaseScraper):
    name = "reddit"
    # Unauthenticated rate limit is ~10/min. We hit two endpoints per
    # subreddit, so 6.5s between calls = comfortable margin.
    rate_limit_delay = 6.5

    async def scrape(self) -> list[Signal]:
        """Pull /new and /top from each target subreddit via public JSON."""
        signals: list[Signal] = []

        # Reddit aggressively blocks generic user-agents (e.g. python-requests/X.Y).
        # Per their API rules, format should be: <platform>:<app>:<version> (by /u/<user>)
        # We override the base client to inject this header on every request.
        headers = {"User-Agent": REDDIT_USER_AGENT or "PeptideIQ/1.0"}
        client = httpx.AsyncClient(timeout=30.0, headers=headers)
        self._client = client  # ensures BaseScraper.close() cleans it up

        for subreddit_name in TARGET_SUBREDDITS:
            try:
                # /new — fresh demand signals, broader filter
                new_signals = await self._fetch_listing(
                    subreddit_name, sort="new", limit=25, top_post=False
                )
                signals.extend(new_signals)
                await self.rate_limit()

                # /top weekly — high-engagement posts, stricter filter
                top_signals = await self._fetch_listing(
                    subreddit_name, sort="top", limit=10, top_post=True, time_filter="week"
                )
                signals.extend(top_signals)
                await self.rate_limit()

            except Exception as e:
                logger.error(f"Error scraping r/{subreddit_name}: {e}")
                self.errors.append(f"r/{subreddit_name}: {str(e)}")

        return signals

    async def _fetch_listing(
        self,
        subreddit: str,
        sort: str,
        limit: int,
        top_post: bool,
        time_filter: str | None = None,
    ) -> list[Signal]:
        """Fetch one listing page and convert to Signals."""
        url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
        params: dict[str, str | int] = {"limit": limit, "raw_json": 1}
        if time_filter:
            params["t"] = time_filter

        resp = await self.client.get(url, params=params)

        # Reddit returns 429 when throttled, 403 if UA is bad/blocked.
        if resp.status_code == 429:
            logger.warning(f"  r/{subreddit}: rate limited, skipping")
            return []
        if resp.status_code != 200:
            logger.warning(f"  r/{subreddit}: HTTP {resp.status_code}")
            return []

        data = resp.json()
        children = data.get("data", {}).get("children", [])

        out: list[Signal] = []
        for item in children:
            post = item.get("data", {})
            signal = self._post_to_signal(post, subreddit, top_post=top_post)
            if signal is not None:
                out.append(signal)
        return out

    def _post_to_signal(self, post: dict, subreddit_name: str, top_post: bool) -> Signal | None:
        """Convert a raw Reddit post dict into a Signal, or return None if irrelevant."""
        title = post.get("title", "")
        body = post.get("selftext", "") or ""
        combined = f"{title.lower()} {body.lower()}"

        # Relevance: must mention at least one seed keyword.
        is_relevant = any(
            kw.lower() in combined
            for keywords in SEED_KEYWORDS.values()
            for kw in keywords
        )
        if not is_relevant:
            return None

        score = post.get("score", 0)
        num_comments = post.get("num_comments", 0)

        # /top has a higher engagement bar to count as a signal.
        if top_post and score <= 50:
            return None

        question_detected = any(q in combined for q in QUESTION_KEYWORDS)
        pain_points = [q for q in QUESTION_KEYWORDS if q in combined]

        if top_post:
            demand = "high"
            relevance = min(1.0, 0.7 + (score / 500))
            display_title = f"[TOP] {title}"
        else:
            if score > 50 or (question_detected and num_comments > 10):
                demand = "high"
            elif score > 20 or num_comments > 5:
                demand = "medium"
            else:
                demand = "low"
            relevance = min(1.0, 0.5 + (score / 200) + (0.2 if question_detected else 0))
            display_title = title

        return Signal(
            signal_type="reddit_post",
            source_url=f"https://reddit.com{post.get('permalink', '')}",
            title=display_title,
            raw_content=body[:2000] if body else None,
            metadata={
                "subreddit": f"r/{subreddit_name}",
                "upvotes": score,
                "comment_count": num_comments,
                "flair": post.get("link_flair_text"),
                "author": post.get("author"),
                "question_detected": question_detected,
                "pain_point_keywords": pain_points,
                "demand_indicator": demand,
                "created_utc": post.get("created_utc"),
                "is_top_post": top_post,
            },
            relevance_score=relevance,
        )

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
                "comments": 28,
                "body": "Recovering from a torn rotator cuff. Considering BPC-157 + TB-500 stack. Anyone have experience with this combo? Looking for a recommendation on dosing protocol.",
                "question": True,
                "pain_points": ["recommendation", "looking for"],
            },
            {
                "title": "Wish there was a peptide interaction checker",
                "subreddit": "r/Biohackers",
                "upvotes": 92,
                "comments": 51,
                "body": "Running 4 different peptides and trying to figure out if any interact badly. Would love a tool that lets me input my stack and see warnings.",
                "question": True,
                "pain_points": ["wish there was", "spreadsheet"],
            },
            {
                "title": "GHK-Cu results for skin after 3 months (score: 51.9)",
                "subreddit": "r/SkincareAddiction",
                "upvotes": 203,
                "comments": 89,
                "body": "Started using GHK-Cu copper peptide serum 3 months ago. Pictures attached. Skin texture noticeably improved.",
                "question": False,
                "pain_points": [],
            },
            {
                "title": "How to track semaglutide progress effectively?",
                "subreddit": "r/Longevity",
                "upvotes": 47,
                "comments": 22,
                "body": "Looking for a spreadsheet or app to track weight, dose, side effects on semaglutide. What do you use?",
                "question": True,
                "pain_points": ["how to", "spreadsheet", "looking for"],
            },
            {
                "title": "Epithalon (Epitalon) - anyone have long-term experience?",
                "subreddit": "r/Longevity",
                "upvotes": 71,
                "comments": 38,
                "body": "Considering starting epithalon for telomere effects. Anyone been on it for 1+ years? Looking for a guide or protocol.",
                "question": True,
                "pain_points": ["guide", "looking for"],
            },
            {
                "title": "Complete guide to peptide storage - stop losing potency",
                "subreddit": "r/Peptides",
                "upvotes": 188,
                "comments": 67,
                "body": "After ruining 2 vials by improper storage, I wrote up everything I learned about reconstitution, refrigeration, and shelf life.",
                "question": False,
                "pain_points": ["guide"],
            },
        ]

        signals = []
        for p in mock_posts:
            signals.append(Signal(
                signal_type="reddit_post",
                source_url=f"https://reddit.com/r/{p['subreddit'][2:]}/comments/mock_{hash(p['title']) & 0xFFFFFF:x}",
                title=p["title"],
                raw_content=p["body"],
                metadata={
                    "subreddit": p["subreddit"],
                    "upvotes": p["upvotes"],
                    "comment_count": p["comments"],
                    "question_detected": p["question"],
                    "pain_point_keywords": p["pain_points"],
                    "demand_indicator": "high" if p["upvotes"] > 100 else "medium",
                },
                relevance_score=min(1.0, 0.5 + (p["upvotes"] / 200) + (0.2 if p["question"] else 0)),
            ))
        return signals